#[test_only]
module aptospay::payment_escrow_tests {
    use std::signer;
    use std::string;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptospay::payment_escrow;

    // ======================== Test Setup ========================

    /// Initialize test environment with APT coins
    fun setup_test(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(aptos_framework);

        // Initialize AptosCoin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        // Create accounts
        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);
        account::create_account_for_test(sender_addr);
        account::create_account_for_test(recipient_addr);

        // Register for APT
        coin::register<AptosCoin>(sender);
        coin::register<AptosCoin>(recipient);

        // Mint 1000 APT to sender (1000 * 10^8 Octas)
        let coins = coin::mint<AptosCoin>(100_000_000_000, &mint_cap);
        coin::deposit(sender_addr, coins);

        // Initialize escrow module
        payment_escrow::init_for_test(admin);

        // Cleanup capabilities
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    // ======================== Create Escrow Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    /// Test successful escrow creation
    public fun test_create_escrow_success(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);
        let initial_balance = coin::balance<AptosCoin>(sender_addr);

        // Create escrow for 5 APT
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            500_000_000, // 5 APT in Octas
            b"Payment for services"
        );

        // Verify sender balance decreased
        let new_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(new_balance == initial_balance - 500_000_000, 1);

        // Verify escrow exists
        assert!(payment_escrow::escrow_exists(1), 2);

        // Verify escrow details
        let (escrow_sender, escrow_recipient, amount, released, cancelled) =
            payment_escrow::get_escrow_details(1);
        assert!(escrow_sender == sender_addr, 3);
        assert!(escrow_recipient == recipient_addr, 4);
        assert!(amount == 500_000_000, 5);
        assert!(!released, 6);
        assert!(!cancelled, 7);

        // Verify registry stats
        let (total_escrows, total_released, total_cancelled, total_volume) =
            payment_escrow::get_registry_stats();
        assert!(total_escrows == 1, 8);
        assert!(total_released == 0, 9);
        assert!(total_cancelled == 0, 10);
        assert!(total_volume == 500_000_000, 11);
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    #[expected_failure(abort_code = payment_escrow::EINVALID_AMOUNT)]
    /// Test that zero amount fails
    public fun test_create_escrow_zero_amount(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let recipient_addr = signer::address_of(recipient);

        // Should fail with EINVALID_AMOUNT
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            0, // Zero amount
            b"Invalid payment"
        );
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    #[expected_failure(abort_code = payment_escrow::EINVALID_RECIPIENT)]
    /// Test that zero address recipient fails
    public fun test_create_escrow_zero_recipient(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        // Should fail with EINVALID_RECIPIENT
        payment_escrow::create_escrow(
            sender,
            @0x0, // Zero address
            100_000_000,
            b"Invalid recipient"
        );
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    #[expected_failure(abort_code = payment_escrow::EINSUFFICIENT_BALANCE)]
    /// Test that insufficient balance fails
    public fun test_create_escrow_insufficient_balance(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let recipient_addr = signer::address_of(recipient);

        // Try to escrow more than available (sender has 1000 APT)
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            200_000_000_000, // 2000 APT (more than balance)
            b"Too much"
        );
    }

    // ======================== Release Escrow Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    /// Test successful escrow release
    public fun test_release_escrow_success(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let recipient_addr = signer::address_of(recipient);
        let initial_recipient_balance = coin::balance<AptosCoin>(recipient_addr);

        // Create escrow
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            300_000_000, // 3 APT
            b"Test payment"
        );

        // Release escrow
        payment_escrow::release_escrow(recipient, 1);

        // Verify recipient received funds
        let new_balance = coin::balance<AptosCoin>(recipient_addr);
        assert!(new_balance == initial_recipient_balance + 300_000_000, 1);

        // Verify escrow no longer exists
        assert!(!payment_escrow::escrow_exists(1), 2);

        // Verify registry stats
        let (total_escrows, total_released, total_cancelled, _volume) =
            payment_escrow::get_registry_stats();
        assert!(total_escrows == 1, 3);
        assert!(total_released == 1, 4);
        assert!(total_cancelled == 0, 5);
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456, attacker = @0x789)]
    #[expected_failure(abort_code = payment_escrow::ENOT_AUTHORIZED)]
    /// Test that non-recipient cannot release
    public fun test_release_escrow_wrong_recipient(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer,
        attacker: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let recipient_addr = signer::address_of(recipient);

        // Create account for attacker
        let attacker_addr = signer::address_of(attacker);
        account::create_account_for_test(attacker_addr);

        // Create escrow
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            100_000_000,
            b"Test"
        );

        // Attacker tries to release - should fail
        payment_escrow::release_escrow(attacker, 1);
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    #[expected_failure(abort_code = payment_escrow::EESCROW_NOT_FOUND)]
    /// Test that releasing non-existent escrow fails
    public fun test_release_nonexistent_escrow(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        // Try to release escrow that doesn't exist
        payment_escrow::release_escrow(recipient, 999);
    }

    // ======================== Cancel Escrow Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    /// Test successful escrow cancellation
    public fun test_cancel_escrow_success(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);
        let initial_balance = coin::balance<AptosCoin>(sender_addr);

        // Create escrow
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            200_000_000, // 2 APT
            b"Test payment"
        );

        // Verify balance decreased
        let balance_after_escrow = coin::balance<AptosCoin>(sender_addr);
        assert!(balance_after_escrow == initial_balance - 200_000_000, 1);

        // Cancel escrow
        payment_escrow::cancel_escrow(sender, 1);

        // Verify sender got refund
        let final_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(final_balance == initial_balance, 2);

        // Verify escrow no longer exists
        assert!(!payment_escrow::escrow_exists(1), 3);

        // Verify registry stats
        let (total_escrows, total_released, total_cancelled, _volume) =
            payment_escrow::get_registry_stats();
        assert!(total_escrows == 1, 4);
        assert!(total_released == 0, 5);
        assert!(total_cancelled == 1, 6);
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456, attacker = @0x789)]
    #[expected_failure(abort_code = payment_escrow::ENOT_AUTHORIZED)]
    /// Test that non-sender cannot cancel
    public fun test_cancel_escrow_wrong_sender(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer,
        attacker: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let recipient_addr = signer::address_of(recipient);

        // Create account for attacker
        let attacker_addr = signer::address_of(attacker);
        account::create_account_for_test(attacker_addr);

        // Create escrow
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            100_000_000,
            b"Test"
        );

        // Attacker tries to cancel - should fail
        payment_escrow::cancel_escrow(attacker, 1);
    }

    // ======================== Multiple Escrow Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient1 = @0x456, recipient2 = @0x789)]
    /// Test creating multiple escrows
    public fun test_multiple_escrows(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient1: &signer,
        recipient2: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient1);

        let recipient1_addr = signer::address_of(recipient1);
        let recipient2_addr = signer::address_of(recipient2);

        // Create account for recipient2
        account::create_account_for_test(recipient2_addr);
        coin::register<AptosCoin>(recipient2);

        // Create first escrow
        payment_escrow::create_escrow(
            sender,
            recipient1_addr,
            100_000_000, // 1 APT
            b"Payment 1"
        );

        // Create second escrow
        payment_escrow::create_escrow(
            sender,
            recipient2_addr,
            200_000_000, // 2 APT
            b"Payment 2"
        );

        // Verify both exist
        assert!(payment_escrow::escrow_exists(1), 1);
        assert!(payment_escrow::escrow_exists(2), 2);

        // Verify different recipients
        let (_s1, r1, a1, _rel1, _can1) = payment_escrow::get_escrow_details(1);
        let (_s2, r2, a2, _rel2, _can2) = payment_escrow::get_escrow_details(2);

        assert!(r1 == recipient1_addr, 3);
        assert!(r2 == recipient2_addr, 4);
        assert!(a1 == 100_000_000, 5);
        assert!(a2 == 200_000_000, 6);

        // Release first, cancel second
        payment_escrow::release_escrow(recipient1, 1);
        payment_escrow::cancel_escrow(sender, 2);

        // Verify stats
        let (total_escrows, total_released, total_cancelled, total_volume) =
            payment_escrow::get_registry_stats();
        assert!(total_escrows == 2, 7);
        assert!(total_released == 1, 8);
        assert!(total_cancelled == 1, 9);
        assert!(total_volume == 300_000_000, 10);
    }

    // ======================== Edge Case Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    /// Test escrow with empty memo
    public fun test_empty_memo(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let recipient_addr = signer::address_of(recipient);

        // Create escrow with empty memo
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            100_000_000,
            b"" // Empty memo
        );

        assert!(payment_escrow::escrow_exists(1), 1);
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123, recipient = @0x456)]
    /// Test escrow with long memo
    public fun test_long_memo(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        recipient: &signer
    ) {
        setup_test(aptos_framework, admin, sender, recipient);

        let recipient_addr = signer::address_of(recipient);

        // Create escrow with long memo
        payment_escrow::create_escrow(
            sender,
            recipient_addr,
            100_000_000,
            b"This is a very long memo that describes the payment in great detail including the reason for payment and any relevant contract references or invoice numbers that might be useful for accounting purposes and tax documentation."
        );

        assert!(payment_escrow::escrow_exists(1), 1);
    }

    #[test(aptos_framework = @0x1, admin = @aptospay, sender = @0x123)]
    /// Test escrow to self
    public fun test_escrow_to_self(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) {
        // Initialize without recipient
        timestamp::set_time_has_started_for_testing(aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        let sender_addr = signer::address_of(sender);
        account::create_account_for_test(sender_addr);
        coin::register<AptosCoin>(sender);

        let coins = coin::mint<AptosCoin>(100_000_000_000, &mint_cap);
        coin::deposit(sender_addr, coins);

        payment_escrow::init_for_test(admin);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        // Create escrow to self
        payment_escrow::create_escrow(
            sender,
            sender_addr, // Same as sender
            100_000_000,
            b"Self-escrow"
        );

        assert!(payment_escrow::escrow_exists(1), 1);

        // Can release to self
        payment_escrow::release_escrow(sender, 1);
    }
}
