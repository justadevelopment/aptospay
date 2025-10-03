#[test_only]
module aptospay::escrow_v2_test {
    use std::option;
    use std::signer;
    use aptos_framework::timestamp;
    use aptos_framework::aptos_coin;
    use aptos_framework::coin;
    use aptos_framework::account;
    use aptospay::escrow_v2;

    const ONE_APT: u64 = 100_000_000; // 1 APT in Octas

    // ======================== Test Setup ========================

    fun setup_test(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        // Initialize timestamp
        timestamp::set_time_has_started_for_testing(aptos_framework);
        timestamp::update_global_time_for_test_secs(1000);

        // Initialize AptosCoin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        // Create accounts
        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);
        let arbitrator_addr = signer::address_of(arbitrator);

        account::create_account_for_test(sender_addr);
        account::create_account_for_test(recipient_addr);
        account::create_account_for_test(arbitrator_addr);

        // Fund sender account
        let coins = coin::mint(1000 * ONE_APT, &mint_cap);
        coin::deposit(sender_addr, coins);

        // Initialize escrow_v2 module (sender is @aptospay)
        escrow_v2::init_for_test(sender);

        // Clean up capabilities
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    // ======================== Standard Escrow Tests ========================

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_create_standard_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);

        // Create standard escrow
        escrow_v2::create_standard_escrow(
            sender,
            recipient_addr,
            100 * ONE_APT,
            b"Test payment",
        );

        // Verify escrow exists
        assert!(escrow_v2::escrow_exists(1), 0);
        assert!(escrow_v2::get_next_escrow_id() == 2, 1);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_release_standard_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);
        let initial_balance = coin::balance<aptos_coin::AptosCoin>(recipient_addr);

        // Create and release escrow
        escrow_v2::create_standard_escrow(sender, recipient_addr, 100 * ONE_APT, b"Payment");
        escrow_v2::release_escrow(recipient, 1);

        // Verify funds transferred
        let final_balance = coin::balance<aptos_coin::AptosCoin>(recipient_addr);
        assert!(final_balance == initial_balance + 100 * ONE_APT, 0);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_cancel_standard_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);
        let initial_balance = coin::balance<aptos_coin::AptosCoin>(sender_addr);

        // Create and cancel escrow
        escrow_v2::create_standard_escrow(sender, recipient_addr, 100 * ONE_APT, b"Payment");
        escrow_v2::cancel_escrow(sender, 1);

        // Verify funds returned
        let final_balance = coin::balance<aptos_coin::AptosCoin>(sender_addr);
        assert!(final_balance == initial_balance, 0);
    }

    // ======================== Time-Locked Escrow Tests ========================

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_create_time_locked_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);

        // Create time-locked escrow
        // Release in 1 hour, expire in 1 day
        escrow_v2::create_time_locked_escrow(
            sender,
            recipient_addr,
            100 * ONE_APT,
            b"Delayed payment",
            1000 + 3600,  // release_time: now + 1 hour
            1000 + 86400, // expiry_time: now + 1 day
        );

        // Verify escrow exists
        assert!(escrow_v2::escrow_exists(1), 0);

        // Verify not claimable yet
        assert!(!escrow_v2::is_claimable(1), 1);

        // Verify not expired
        assert!(!escrow_v2::is_expired(1), 2);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    #[expected_failure(abort_code = 0x12e, location = aptospay::escrow_v2)]
    public entry fun test_time_locked_escrow_claim_before_release_time(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);

        // Create time-locked escrow
        escrow_v2::create_time_locked_escrow(
            sender,
            recipient_addr,
            100 * ONE_APT,
            b"Delayed payment",
            1000 + 3600,  // release_time: now + 1 hour
            1000 + 86400, // expiry_time: now + 1 day
        );

        // Try to claim before release_time (should fail)
        escrow_v2::release_escrow(recipient, 1);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_time_locked_escrow_claim_after_release_time(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);

        // Create time-locked escrow
        escrow_v2::create_time_locked_escrow(
            sender,
            recipient_addr,
            100 * ONE_APT,
            b"Delayed payment",
            1000 + 3600,  // release_time: now + 1 hour
            1000 + 86400, // expiry_time: now + 1 day
        );

        // Fast forward past release_time
        timestamp::update_global_time_for_test_secs(1000 + 7200); // 2 hours later

        // Now can claim
        assert!(escrow_v2::is_claimable(1), 0);
        escrow_v2::release_escrow(recipient, 1);

        // Verify funds transferred
        let balance = coin::balance<aptos_coin::AptosCoin>(recipient_addr);
        assert!(balance == 100 * ONE_APT, 1);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_time_locked_escrow_auto_refund_on_expiry(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);
        let initial_balance = coin::balance<aptos_coin::AptosCoin>(sender_addr);

        // Create time-locked escrow
        escrow_v2::create_time_locked_escrow(
            sender,
            recipient_addr,
            100 * ONE_APT,
            b"Expiring payment",
            1000 + 3600,  // release_time: now + 1 hour
            1000 + 7200,  // expiry_time: now + 2 hours
        );

        // Fast forward past expiry_time
        timestamp::update_global_time_for_test_secs(1000 + 10000);

        // Verify expired
        assert!(escrow_v2::is_expired(1), 0);
        assert!(!escrow_v2::is_claimable(1), 1);

        // Anyone can trigger auto-refund
        escrow_v2::claim_expired_escrow(recipient, 1);

        // Verify funds returned to sender
        let final_balance = coin::balance<aptos_coin::AptosCoin>(sender_addr);
        assert!(final_balance == initial_balance, 2);
    }

    // ======================== Arbitrated Escrow Tests ========================

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_create_arbitrated_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);
        let arbitrator_addr = signer::address_of(arbitrator);

        // Create arbitrated escrow
        escrow_v2::create_arbitrated_escrow(
            sender,
            recipient_addr,
            arbitrator_addr,
            100 * ONE_APT,
            b"Dispute-protected payment",
            0, // no expiry
        );

        // Verify escrow exists
        assert!(escrow_v2::escrow_exists(1), 0);

        // Get details and verify arbitrator is set
        let (escrow_type, _sender, _recipient, arbitrator_opt, _amount, _release, _expiry, _released, _cancelled) =
            escrow_v2::get_escrow_details(1);

        assert!(escrow_type == 2, 1); // ESCROW_TYPE_ARBITRATED
        assert!(option::is_some(&arbitrator_opt), 2);
        assert!(*option::borrow(&arbitrator_opt) == arbitrator_addr, 3);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_arbitrator_can_release_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);
        let arbitrator_addr = signer::address_of(arbitrator);
        let initial_balance = coin::balance<aptos_coin::AptosCoin>(recipient_addr);

        // Create arbitrated escrow
        escrow_v2::create_arbitrated_escrow(
            sender,
            recipient_addr,
            arbitrator_addr,
            100 * ONE_APT,
            b"Arbitrated payment",
            0,
        );

        // Arbitrator releases funds
        escrow_v2::release_escrow(arbitrator, 1);

        // Verify funds transferred to recipient
        let final_balance = coin::balance<aptos_coin::AptosCoin>(recipient_addr);
        assert!(final_balance == initial_balance + 100 * ONE_APT, 0);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_recipient_can_release_arbitrated_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);
        let arbitrator_addr = signer::address_of(arbitrator);

        // Create arbitrated escrow
        escrow_v2::create_arbitrated_escrow(
            sender,
            recipient_addr,
            arbitrator_addr,
            100 * ONE_APT,
            b"Arbitrated payment",
            0,
        );

        // Recipient can also release (no dispute)
        escrow_v2::release_escrow(recipient, 1);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    #[expected_failure(abort_code = 0x64, location = aptospay::escrow_v2)]
    public entry fun test_unauthorized_cannot_release_arbitrated_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);
        let arbitrator_addr = signer::address_of(arbitrator);

        // Create arbitrated escrow
        escrow_v2::create_arbitrated_escrow(
            sender,
            recipient_addr,
            arbitrator_addr,
            100 * ONE_APT,
            b"Arbitrated payment",
            0,
        );

        // Sender cannot release (only recipient or arbitrator)
        escrow_v2::release_escrow(sender, 1);
    }

    // ======================== Combined Scenarios ========================

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_arbitrated_time_locked_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);
        let arbitrator_addr = signer::address_of(arbitrator);

        // Create arbitrated escrow with expiry
        escrow_v2::create_arbitrated_escrow(
            sender,
            recipient_addr,
            arbitrator_addr,
            100 * ONE_APT,
            b"Complex escrow",
            1000 + 86400, // expires in 1 day
        );

        // Arbitrator can override and release immediately
        escrow_v2::release_escrow(arbitrator, 1);

        // Verify funds transferred
        let balance = coin::balance<aptos_coin::AptosCoin>(recipient_addr);
        assert!(balance == 100 * ONE_APT, 0);
    }

    // ======================== Statistics Tests ========================

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    public entry fun test_registry_statistics(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);
        let arbitrator_addr = signer::address_of(arbitrator);

        // Create various escrow types
        escrow_v2::create_standard_escrow(sender, recipient_addr, 10 * ONE_APT, b"Standard");
        escrow_v2::create_time_locked_escrow(
            sender,
            recipient_addr,
            20 * ONE_APT,
            b"Time-locked",
            1000 + 3600,
            1000 + 86400,
        );
        escrow_v2::create_arbitrated_escrow(
            sender,
            recipient_addr,
            arbitrator_addr,
            30 * ONE_APT,
            b"Arbitrated",
            0,
        );

        // Get statistics
        let (total_escrows, total_released, total_cancelled, total_expired,
             total_standard, total_time_locked, total_arbitrated, total_volume) =
            escrow_v2::get_registry_stats();

        // Verify counts
        assert!(total_escrows == 3, 0);
        assert!(total_standard == 1, 1);
        assert!(total_time_locked == 1, 2);
        assert!(total_arbitrated == 1, 3);
        assert!(total_volume == 60 * ONE_APT, 4);
        assert!(total_released == 0, 5);

        // Release one escrow
        escrow_v2::release_escrow(recipient, 1);

        let (_, released, _, _, _, _, _, _) = escrow_v2::get_registry_stats();
        assert!(released == 1, 6);
    }

    // ======================== Edge Cases ========================

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    #[expected_failure(abort_code = 0xc8, location = aptospay::escrow_v2)]
    public entry fun test_cannot_create_zero_amount_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);

        // Try to create escrow with 0 amount (should fail)
        escrow_v2::create_standard_escrow(sender, recipient_addr, 0, b"Zero amount");
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    #[expected_failure(abort_code = 0xca, location = aptospay::escrow_v2)]
    public entry fun test_cannot_create_escrow_to_zero_address(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        // Try to create escrow to zero address (should fail)
        escrow_v2::create_standard_escrow(sender, @0x0, 100 * ONE_APT, b"Zero address");
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    #[expected_failure(abort_code = 0x12c, location = aptospay::escrow_v2)]
    public entry fun test_cannot_release_already_released_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);

        // Create and release escrow
        escrow_v2::create_standard_escrow(sender, recipient_addr, 100 * ONE_APT, b"Payment");
        escrow_v2::release_escrow(recipient, 1);

        // Try to release again (should fail)
        escrow_v2::release_escrow(recipient, 1);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, arbitrator = @0x345)]
    #[expected_failure(abort_code = 0x12d, location = aptospay::escrow_v2)]
    public entry fun test_cannot_release_cancelled_escrow(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        arbitrator: &signer,
    ) {
        setup_test(aptos_framework, sender, recipient, arbitrator);

        let recipient_addr = signer::address_of(recipient);

        // Create and cancel escrow
        escrow_v2::create_standard_escrow(sender, recipient_addr, 100 * ONE_APT, b"Payment");
        escrow_v2::cancel_escrow(sender, 1);

        // Try to release (should fail)
        escrow_v2::release_escrow(recipient, 1);
    }
}
