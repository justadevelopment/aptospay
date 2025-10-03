#[test_only]
module aptospay::vesting_stream_test {
    use std::signer;
    use aptos_framework::coin::{Self, BurnCapability};
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::aptos_account;
    use aptospay::vesting_stream;

    // Test constants
    const ONE_APT: u64 = 100_000_000; // 1 APT in Octas
    const SENDER_INITIAL_BALANCE: u64 = 1000_000_000_000; // 10,000 APT

    /// Setup function for tests
    fun setup(aptos_framework: &signer, sender: &signer): BurnCapability<AptosCoin> {
        // Initialize timestamp
        timestamp::set_time_has_started_for_testing(aptos_framework);

        // Initialize AptosCoin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        // Create sender account and fund it
        account::create_account_for_test(signer::address_of(sender));
        coin::register<AptosCoin>(sender);
        let coins = coin::mint<AptosCoin>(SENDER_INITIAL_BALANCE, &mint_cap);
        coin::deposit(signer::address_of(sender), coins);
        coin::destroy_mint_cap(mint_cap);

        // Initialize vesting module
        vesting_stream::init_for_test(sender);

        burn_cap
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test creating a basic vesting stream
    public entry fun test_create_stream(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);

        let stream_amount = 100 * ONE_APT; // 100 APT
        let start_time = 1000;
        let end_time = 2000; // 1000 second duration
        let cliff_time = 0; // No cliff

        vesting_stream::create_stream(
            sender,
            recipient_addr,
            stream_amount,
            start_time,
            end_time,
            cliff_time,
        );

        // Verify stream was created
        assert!(vesting_stream::stream_exists(1), 0);

        // Verify stream details
        let (stream_sender, stream_recipient, total, claimed, start, end, cliff, cancelled) =
            vesting_stream::get_stream_details(1);

        assert!(stream_sender == signer::address_of(sender), 1);
        assert!(stream_recipient == recipient_addr, 2);
        assert!(total == stream_amount, 3);
        assert!(claimed == 0, 4);
        assert!(start == start_time, 5);
        assert!(end == end_time, 6);
        assert!(cliff == cliff_time, 7);
        assert!(!cancelled, 8);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test linear vesting calculation
    public entry fun test_linear_vesting(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);

        let stream_amount = 100 * ONE_APT; // 100 APT
        let start_time = 1000;
        let end_time = 2000; // 1000 second duration

        vesting_stream::create_stream(
            sender,
            recipient_addr,
            stream_amount,
            start_time,
            end_time,
            0, // No cliff
        );

        // Before start: 0% vested
        timestamp::update_global_time_for_test_secs(999);
        assert!(vesting_stream::calculate_vested_amount(1) == 0, 0);

        // At start: 0% vested
        timestamp::update_global_time_for_test_secs(1000);
        assert!(vesting_stream::calculate_vested_amount(1) == 0, 1);

        // 25% through: 25 APT vested
        timestamp::update_global_time_for_test_secs(1250);
        let vested = vesting_stream::calculate_vested_amount(1);
        assert!(vested == 25 * ONE_APT, 2);

        // 50% through: 50 APT vested
        timestamp::update_global_time_for_test_secs(1500);
        let vested = vesting_stream::calculate_vested_amount(1);
        assert!(vested == 50 * ONE_APT, 3);

        // 75% through: 75 APT vested
        timestamp::update_global_time_for_test_secs(1750);
        let vested = vesting_stream::calculate_vested_amount(1);
        assert!(vested == 75 * ONE_APT, 4);

        // At end: 100% vested
        timestamp::update_global_time_for_test_secs(2000);
        let vested = vesting_stream::calculate_vested_amount(1);
        assert!(vested == 100 * ONE_APT, 5);

        // After end: still 100% vested
        timestamp::update_global_time_for_test_secs(3000);
        let vested = vesting_stream::calculate_vested_amount(1);
        assert!(vested == 100 * ONE_APT, 6);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test cliff functionality
    public entry fun test_cliff(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);

        let stream_amount = 100 * ONE_APT;
        let start_time = 1000;
        let end_time = 2000;
        let cliff_time = 1500; // 50% through

        vesting_stream::create_stream(
            sender,
            recipient_addr,
            stream_amount,
            start_time,
            end_time,
            cliff_time,
        );

        // Before cliff: 0 vested (even though time has passed)
        timestamp::update_global_time_for_test_secs(1250);
        assert!(vesting_stream::calculate_vested_amount(1) == 0, 0);

        // Just before cliff: still 0 vested
        timestamp::update_global_time_for_test_secs(1499);
        assert!(vesting_stream::calculate_vested_amount(1) == 0, 1);

        // At cliff: 50 APT vested (linear from start, not from cliff)
        timestamp::update_global_time_for_test_secs(1500);
        let vested = vesting_stream::calculate_vested_amount(1);
        assert!(vested == 50 * ONE_APT, 2);

        // After cliff: continues linear vesting
        timestamp::update_global_time_for_test_secs(1750);
        let vested = vesting_stream::calculate_vested_amount(1);
        assert!(vested == 75 * ONE_APT, 3);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test claiming vested tokens
    public entry fun test_claim_vested(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        aptos_account::create_account(recipient_addr);

        let stream_amount = 100 * ONE_APT;
        let start_time = 1000;
        let end_time = 2000;

        vesting_stream::create_stream(
            sender,
            recipient_addr,
            stream_amount,
            start_time,
            end_time,
            0,
        );

        // Claim at 50%
        timestamp::update_global_time_for_test_secs(1500);
        vesting_stream::claim_vested(recipient, 1);

        // Recipient should have 50 APT
        assert!(coin::balance<AptosCoin>(recipient_addr) == 50 * ONE_APT, 0);

        // Stream should show 50 APT claimed
        let (_, _, _, claimed, _, _, _, _) = vesting_stream::get_stream_details(1);
        assert!(claimed == 50 * ONE_APT, 1);

        // Claim remaining at 100%
        timestamp::update_global_time_for_test_secs(2000);
        vesting_stream::claim_vested(recipient, 1);

        // Recipient should have 100 APT total
        assert!(coin::balance<AptosCoin>(recipient_addr) == 100 * ONE_APT, 2);

        // Stream should show 100 APT claimed
        let (_, _, _, claimed, _, _, _, _) = vesting_stream::get_stream_details(1);
        assert!(claimed == 100 * ONE_APT, 3);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test multiple partial claims
    public entry fun test_multiple_claims(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        aptos_account::create_account(recipient_addr);

        let stream_amount = 100 * ONE_APT;

        vesting_stream::create_stream(sender, recipient_addr, stream_amount, 1000, 2000, 0);

        // Claim 1: at 25%
        timestamp::update_global_time_for_test_secs(1250);
        vesting_stream::claim_vested(recipient, 1);
        assert!(coin::balance<AptosCoin>(recipient_addr) == 25 * ONE_APT, 0);

        // Claim 2: at 50%
        timestamp::update_global_time_for_test_secs(1500);
        vesting_stream::claim_vested(recipient, 1);
        assert!(coin::balance<AptosCoin>(recipient_addr) == 50 * ONE_APT, 1);

        // Claim 3: at 75%
        timestamp::update_global_time_for_test_secs(1750);
        vesting_stream::claim_vested(recipient, 1);
        assert!(coin::balance<AptosCoin>(recipient_addr) == 75 * ONE_APT, 2);

        // Claim 4: at 100%
        timestamp::update_global_time_for_test_secs(2000);
        vesting_stream::claim_vested(recipient, 1);
        assert!(coin::balance<AptosCoin>(recipient_addr) == 100 * ONE_APT, 3);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test stream cancellation
    public entry fun test_cancel_stream(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        let sender_addr = signer::address_of(sender);

        let stream_amount = 100 * ONE_APT;
        let initial_balance = coin::balance<AptosCoin>(sender_addr);

        vesting_stream::create_stream(sender, recipient_addr, stream_amount, 1000, 2000, 0);

        // Cancel at 50%
        timestamp::update_global_time_for_test_secs(1500);
        vesting_stream::cancel_stream(sender, 1);

        // Sender should get 50 APT back (unvested portion)
        let expected_balance = initial_balance - 50 * ONE_APT;
        assert!(coin::balance<AptosCoin>(sender_addr) == expected_balance, 0);

        // Stream should be marked as cancelled
        let (_, _, _, _, _, _, _, cancelled) = vesting_stream::get_stream_details(1);
        assert!(cancelled, 1);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test recipient can claim vested tokens after cancellation
    public entry fun test_claim_after_cancellation(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        aptos_account::create_account(recipient_addr);

        let stream_amount = 100 * ONE_APT;

        vesting_stream::create_stream(sender, recipient_addr, stream_amount, 1000, 2000, 0);

        // Cancel at 60%
        timestamp::update_global_time_for_test_secs(1600);
        vesting_stream::cancel_stream(sender, 1);

        // Recipient should still be able to claim the 60 APT that vested before cancellation
        vesting_stream::claim_vested(recipient, 1);
        assert!(coin::balance<AptosCoin>(recipient_addr) == 60 * ONE_APT, 0);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    #[expected_failure(abort_code = 0x12e, location = aptospay::vesting_stream)]
    /// Test cannot claim before cliff
    public entry fun test_cannot_claim_before_cliff(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        aptos_account::create_account(recipient_addr);

        vesting_stream::create_stream(sender, recipient_addr, 100 * ONE_APT, 1000, 2000, 1500);

        // Try to claim before cliff
        timestamp::update_global_time_for_test_secs(1250);
        vesting_stream::claim_vested(recipient, 1);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    #[expected_failure(abort_code = 0x12d, location = aptospay::vesting_stream)]
    /// Test cannot claim if no tokens vested
    public entry fun test_cannot_claim_nothing_vested(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        aptos_account::create_account(recipient_addr);

        vesting_stream::create_stream(sender, recipient_addr, 100 * ONE_APT, 1000, 2000, 0);

        // Try to claim before start
        timestamp::update_global_time_for_test_secs(500);
        vesting_stream::claim_vested(recipient, 1);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, hacker = @0x999)]
    #[expected_failure(abort_code = 0x64, location = aptospay::vesting_stream)]
    /// Test only recipient can claim
    public entry fun test_only_recipient_can_claim(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        hacker: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        account::create_account_for_test(signer::address_of(hacker));

        vesting_stream::create_stream(sender, recipient_addr, 100 * ONE_APT, 1000, 2000, 0);

        // Hacker tries to claim
        timestamp::update_global_time_for_test_secs(1500);
        vesting_stream::claim_vested(hacker, 1);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234, hacker = @0x999)]
    #[expected_failure(abort_code = 0x64, location = aptospay::vesting_stream)]
    /// Test only sender can cancel
    public entry fun test_only_sender_can_cancel(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
        hacker: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        account::create_account_for_test(signer::address_of(hacker));

        vesting_stream::create_stream(sender, recipient_addr, 100 * ONE_APT, 1000, 2000, 0);

        // Hacker tries to cancel
        timestamp::update_global_time_for_test_secs(1500);
        vesting_stream::cancel_stream(hacker, 1);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    #[expected_failure(abort_code = 0xc9, location = aptospay::vesting_stream)]
    /// Test invalid time parameters
    public entry fun test_invalid_time_params(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);

        // End time before start time
        vesting_stream::create_stream(sender, recipient_addr, 100 * ONE_APT, 2000, 1000, 0);

        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, sender = @aptospay, recipient = @0x234)]
    /// Test registry statistics
    public entry fun test_registry_stats(
        aptos_framework: &signer,
        sender: &signer,
        recipient: &signer,
    ) {
        let burn_cap = setup(aptos_framework, sender);
        let recipient_addr = signer::address_of(recipient);
        aptos_account::create_account(recipient_addr);

        // Create 3 streams
        vesting_stream::create_stream(sender, recipient_addr, 100 * ONE_APT, 1000, 2000, 0);
        vesting_stream::create_stream(sender, recipient_addr, 200 * ONE_APT, 1000, 3000, 0);
        vesting_stream::create_stream(sender, recipient_addr, 300 * ONE_APT, 1000, 4000, 0);

        let (total, completed, cancelled, volume) = vesting_stream::get_registry_stats();
        assert!(total == 3, 0);
        assert!(completed == 0, 1);
        assert!(cancelled == 0, 2);
        assert!(volume == 600 * ONE_APT, 3);

        // Complete one stream
        timestamp::update_global_time_for_test_secs(2000);
        vesting_stream::claim_vested(recipient, 1);

        let (_, completed, _, _) = vesting_stream::get_registry_stats();
        assert!(completed == 1, 4);

        // Cancel one stream
        vesting_stream::cancel_stream(sender, 2);

        let (_, _, cancelled, _) = vesting_stream::get_registry_stats();
        assert!(cancelled == 1, 5);

        coin::destroy_burn_cap(burn_cap);
    }
}
