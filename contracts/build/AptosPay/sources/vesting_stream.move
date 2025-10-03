/// # Vesting Stream Module
///
/// Implements continuous token vesting (streaming) with linear release schedules and optional cliff periods.
/// Enables salary payments, token vesting, scheduled disbursements, and payroll automation.
///
/// ## Features
/// - Linear vesting: Tokens unlock continuously over time
/// - Cliff periods: Optional delay before any tokens unlock
/// - Partial claims: Recipients can claim vested tokens anytime
/// - Stream cancellation: Sender can cancel and reclaim unvested tokens
/// - Multi-stream support: Multiple streams per recipient
/// - View functions: Query vested amounts in real-time
///
/// ## Use Cases
/// - Payroll streaming (salary paid by the second)
/// - Token vesting schedules for team/investors
/// - Scheduled payments with gradual release
/// - Trust fund disbursements
///
/// ## Math
/// Linear vesting formula:
/// ```
/// vested = total_amount * (current_time - start_time) / (end_time - start_time)
/// if current_time < cliff_time: vested = 0
/// if current_time >= end_time: vested = total_amount
/// ```
///
module aptospay::vesting_stream {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};

    // ======================== Error Codes ========================

    /// Stream with this ID does not exist
    const ESTREAM_NOT_FOUND: u64 = 1;

    /// Stream with this ID already exists
    const ESTREAM_ALREADY_EXISTS: u64 = 2;

    /// Amount must be greater than zero
    const EINVALID_AMOUNT: u64 = 200;

    /// Invalid time parameters
    const EINVALID_TIME_PARAMS: u64 = 201;

    /// Recipient address cannot be zero address
    const EINVALID_RECIPIENT: u64 = 202;

    /// Sender does not have sufficient APT balance
    const EINSUFFICIENT_BALANCE: u64 = 203;

    /// Caller is not authorized for this action
    const ENOT_AUTHORIZED: u64 = 100;

    /// Stream has already been cancelled
    const EALREADY_CANCELLED: u64 = 300;

    /// No vested tokens available to claim
    const ENO_VESTED_TOKENS: u64 = 301;

    /// Cliff period has not passed yet
    const ECLIFF_NOT_REACHED: u64 = 302;

    // ======================== Structs ========================

    /// Represents a single vesting stream
    struct VestingStream has key, store {
        /// Address of the sender who created the stream
        sender: address,
        /// Address of the recipient
        recipient: address,
        /// Total amount of APT being vested
        total_amount: u64,
        /// Amount already claimed by recipient
        claimed_amount: u64,
        /// Unix timestamp when vesting starts
        start_time: u64,
        /// Unix timestamp when vesting ends (100% unlocked)
        end_time: u64,
        /// Optional cliff: no tokens unlock before this time (0 = no cliff)
        cliff_time: u64,
        /// Whether the stream has been cancelled
        cancelled: bool,
        /// Timestamp when stream was cancelled (0 if not cancelled)
        cancelled_at: u64,
        /// Escrowed coins (held until vested or cancelled)
        coins: Coin<AptosCoin>,
    }

    /// Global registry of all vesting streams
    struct StreamRegistry has key {
        /// Table mapping stream_id -> VestingStream
        streams: Table<u64, VestingStream>,
        /// Counter for generating unique stream IDs
        next_stream_id: u64,
        /// Total number of streams created
        total_streams: u64,
        /// Total number of streams completed
        total_completed: u64,
        /// Total number of streams cancelled
        total_cancelled: u64,
        /// Total APT volume in all streams
        total_volume: u64,
    }

    // ======================== Events ========================

    #[event]
    /// Emitted when a new vesting stream is created
    struct StreamCreatedEvent has drop, store {
        stream_id: u64,
        sender: address,
        recipient: address,
        total_amount: u64,
        start_time: u64,
        end_time: u64,
        cliff_time: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when recipient claims vested tokens
    struct StreamClaimedEvent has drop, store {
        stream_id: u64,
        sender: address,
        recipient: address,
        claimed_amount: u64,
        total_claimed: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when sender cancels a stream
    struct StreamCancelledEvent has drop, store {
        stream_id: u64,
        sender: address,
        recipient: address,
        vested_amount: u64,
        refunded_amount: u64,
        timestamp: u64,
    }

    // ======================== Initialization ========================

    /// Initialize the vesting stream module
    /// Must be called once during module deployment
    fun init_module(admin: &signer) {
        assert!(signer::address_of(admin) == @aptospay, ENOT_AUTHORIZED);

        move_to(admin, StreamRegistry {
            streams: table::new(),
            next_stream_id: 1,
            total_streams: 0,
            total_completed: 0,
            total_cancelled: 0,
            total_volume: 0,
        });
    }

    // ======================== Public Entry Functions ========================

    /// Create a new vesting stream
    ///
    /// # Arguments
    /// * `sender` - Signer creating the stream
    /// * `recipient` - Address that can claim vested tokens
    /// * `total_amount` - Total amount of APT to vest (in Octas)
    /// * `start_time` - Unix timestamp when vesting starts
    /// * `end_time` - Unix timestamp when vesting ends (100% unlocked)
    /// * `cliff_time` - Optional cliff timestamp (0 for no cliff)
    ///
    /// # Returns
    /// * `u64` - Unique stream ID for tracking
    ///
    /// # Aborts
    /// * `EINVALID_AMOUNT` - If amount is zero
    /// * `EINVALID_RECIPIENT` - If recipient is zero address
    /// * `EINVALID_TIME_PARAMS` - If time parameters are invalid
    /// * `EINSUFFICIENT_BALANCE` - If sender doesn't have enough APT
    public entry fun create_stream(
        sender: &signer,
        recipient: address,
        total_amount: u64,
        start_time: u64,
        end_time: u64,
        cliff_time: u64,
    ) acquires StreamRegistry {
        // Validate inputs
        assert!(total_amount > 0, EINVALID_AMOUNT);
        assert!(recipient != @0x0, EINVALID_RECIPIENT);
        assert!(start_time < end_time, EINVALID_TIME_PARAMS);
        assert!(cliff_time == 0 || (cliff_time >= start_time && cliff_time < end_time), EINVALID_TIME_PARAMS);

        let sender_addr = signer::address_of(sender);

        // Verify sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= total_amount, EINSUFFICIENT_BALANCE);

        // Get registry and generate unique ID
        let registry = borrow_global_mut<StreamRegistry>(@aptospay);
        let stream_id = registry.next_stream_id;
        registry.next_stream_id = registry.next_stream_id + 1;

        // Update statistics
        registry.total_streams = registry.total_streams + 1;
        registry.total_volume = registry.total_volume + total_amount;

        // Withdraw coins from sender
        let escrowed_coins = coin::withdraw<AptosCoin>(sender, total_amount);

        // Create stream resource
        let stream = VestingStream {
            sender: sender_addr,
            recipient,
            total_amount,
            claimed_amount: 0,
            start_time,
            end_time,
            cliff_time,
            cancelled: false,
            cancelled_at: 0,
            coins: escrowed_coins,
        };

        // Store stream in global table
        table::add(&mut registry.streams, stream_id, stream);

        // Emit event
        event::emit(StreamCreatedEvent {
            stream_id,
            sender: sender_addr,
            recipient,
            total_amount,
            start_time,
            end_time,
            cliff_time,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Claim vested tokens from a stream
    /// Recipient can call this multiple times to claim incrementally
    ///
    /// # Arguments
    /// * `recipient` - Signer claiming vested tokens
    /// * `stream_id` - ID of the stream to claim from
    ///
    /// # Aborts
    /// * `ESTREAM_NOT_FOUND` - If stream doesn't exist
    /// * `ENOT_AUTHORIZED` - If caller is not the recipient
    /// * `EALREADY_CANCELLED` - If stream was cancelled
    /// * `ECLIFF_NOT_REACHED` - If cliff period hasn't passed
    /// * `ENO_VESTED_TOKENS` - If no tokens are vested yet
    public entry fun claim_vested(
        recipient: &signer,
        stream_id: u64,
    ) acquires StreamRegistry {
        let recipient_addr = signer::address_of(recipient);
        let registry = borrow_global_mut<StreamRegistry>(@aptospay);

        // Verify stream exists
        assert!(table::contains(&registry.streams, stream_id), ESTREAM_NOT_FOUND);

        let stream = table::borrow_mut(&mut registry.streams, stream_id);

        // Verify caller is the recipient
        assert!(recipient_addr == stream.recipient, ENOT_AUTHORIZED);

        // If cancelled, use cancellation time for vesting calculation
        let now = if (stream.cancelled) {
            stream.cancelled_at
        } else {
            timestamp::now_seconds()
        };

        // Check cliff
        if (stream.cliff_time > 0) {
            assert!(now >= stream.cliff_time, ECLIFF_NOT_REACHED);
        };

        // Calculate vested amount
        let vested = calculate_vested_amount_internal(stream, now);
        let claimable = vested - stream.claimed_amount;

        assert!(claimable > 0, ENO_VESTED_TOKENS);

        // Update claimed amount
        stream.claimed_amount = stream.claimed_amount + claimable;

        // Extract coins to claim
        let claim_coins = coin::extract(&mut stream.coins, claimable);

        // If fully claimed, mark as completed
        if (stream.claimed_amount == stream.total_amount) {
            registry.total_completed = registry.total_completed + 1;
        };

        // Deposit to recipient
        coin::deposit(recipient_addr, claim_coins);

        // Emit event
        event::emit(StreamClaimedEvent {
            stream_id,
            sender: stream.sender,
            recipient: recipient_addr,
            claimed_amount: claimable,
            total_claimed: stream.claimed_amount,
            timestamp: now,
        });
    }

    /// Cancel a stream and refund unvested tokens to sender
    /// Recipient keeps any already-vested tokens
    ///
    /// # Arguments
    /// * `sender` - Signer cancelling the stream
    /// * `stream_id` - ID of the stream to cancel
    ///
    /// # Aborts
    /// * `ESTREAM_NOT_FOUND` - If stream doesn't exist
    /// * `ENOT_AUTHORIZED` - If caller is not the sender
    /// * `EALREADY_CANCELLED` - If stream already cancelled
    public entry fun cancel_stream(
        sender: &signer,
        stream_id: u64,
    ) acquires StreamRegistry {
        let sender_addr = signer::address_of(sender);
        let registry = borrow_global_mut<StreamRegistry>(@aptospay);

        // Verify stream exists
        assert!(table::contains(&registry.streams, stream_id), ESTREAM_NOT_FOUND);

        let stream = table::borrow_mut(&mut registry.streams, stream_id);

        // Verify caller is the sender
        assert!(sender_addr == stream.sender, ENOT_AUTHORIZED);

        // Verify stream is active
        assert!(!stream.cancelled, EALREADY_CANCELLED);

        let now = timestamp::now_seconds();

        // Calculate vested amount at cancellation time
        let vested = calculate_vested_amount_internal(stream, now);
        let unvested = stream.total_amount - vested;

        // Mark as cancelled
        stream.cancelled = true;
        stream.cancelled_at = now;

        // Update statistics
        registry.total_cancelled = registry.total_cancelled + 1;

        // Refund unvested tokens to sender
        if (unvested > 0) {
            let refund_coins = coin::extract(&mut stream.coins, unvested);
            coin::deposit(sender_addr, refund_coins);
        };

        // Emit event
        event::emit(StreamCancelledEvent {
            stream_id,
            sender: sender_addr,
            recipient: stream.recipient,
            vested_amount: vested,
            refunded_amount: unvested,
            timestamp: now,
        });
    }

    // ======================== View Functions ========================

    /// Check if a stream exists
    public fun stream_exists(stream_id: u64): bool acquires StreamRegistry {
        let registry = borrow_global<StreamRegistry>(@aptospay);
        table::contains(&registry.streams, stream_id)
    }

    /// Get stream details
    /// Returns: (sender, recipient, total_amount, claimed_amount, start_time, end_time, cliff_time, cancelled)
    public fun get_stream_details(
        stream_id: u64
    ): (address, address, u64, u64, u64, u64, u64, bool) acquires StreamRegistry {
        let registry = borrow_global<StreamRegistry>(@aptospay);
        assert!(table::contains(&registry.streams, stream_id), ESTREAM_NOT_FOUND);

        let stream = table::borrow(&registry.streams, stream_id);
        (
            stream.sender,
            stream.recipient,
            stream.total_amount,
            stream.claimed_amount,
            stream.start_time,
            stream.end_time,
            stream.cliff_time,
            stream.cancelled
        )
    }

    /// Calculate how much has vested for a stream at current time
    public fun calculate_vested_amount(stream_id: u64): u64 acquires StreamRegistry {
        let registry = borrow_global<StreamRegistry>(@aptospay);
        assert!(table::contains(&registry.streams, stream_id), ESTREAM_NOT_FOUND);

        let stream = table::borrow(&registry.streams, stream_id);
        let now = timestamp::now_seconds();
        calculate_vested_amount_internal(stream, now)
    }

    /// Calculate claimable amount (vested - claimed)
    public fun calculate_claimable_amount(stream_id: u64): u64 acquires StreamRegistry {
        let registry = borrow_global<StreamRegistry>(@aptospay);
        assert!(table::contains(&registry.streams, stream_id), ESTREAM_NOT_FOUND);

        let stream = table::borrow(&registry.streams, stream_id);

        if (stream.cancelled) {
            // If cancelled, only unvested tokens at cancellation time are claimable
            let vested_at_cancellation = calculate_vested_amount_internal(stream, stream.cancelled_at);
            return vested_at_cancellation - stream.claimed_amount
        };

        let now = timestamp::now_seconds();
        let vested = calculate_vested_amount_internal(stream, now);
        vested - stream.claimed_amount
    }

    /// Get registry statistics
    /// Returns: (total_streams, total_completed, total_cancelled, total_volume)
    public fun get_registry_stats(): (u64, u64, u64, u64) acquires StreamRegistry {
        let registry = borrow_global<StreamRegistry>(@aptospay);
        (
            registry.total_streams,
            registry.total_completed,
            registry.total_cancelled,
            registry.total_volume
        )
    }

    // ======================== Internal Functions ========================

    /// Calculate vested amount at a specific timestamp
    /// Implements linear vesting formula with cliff support
    fun calculate_vested_amount_internal(stream: &VestingStream, current_time: u64): u64 {
        // If cancelled, calculate based on cancellation time
        let eval_time = if (stream.cancelled) { stream.cancelled_at } else { current_time };

        // Before start time: nothing vested
        if (eval_time < stream.start_time) {
            return 0
        };

        // Check cliff
        if (stream.cliff_time > 0 && eval_time < stream.cliff_time) {
            return 0
        };

        // After end time: fully vested
        if (eval_time >= stream.end_time) {
            return stream.total_amount
        };

        // Linear vesting: vested = total * (current - start) / (end - start)
        let elapsed = eval_time - stream.start_time;
        let duration = stream.end_time - stream.start_time;

        // Use 128-bit arithmetic to avoid overflow
        let vested = ((stream.total_amount as u128) * (elapsed as u128) / (duration as u128) as u64);

        vested
    }

    // ======================== Test-Only Functions ========================

    #[test_only]
    /// Initialize module for testing
    public fun init_for_test(admin: &signer) {
        init_module(admin);
    }

    #[test_only]
    /// Get next stream ID (for testing)
    public fun get_next_stream_id(): u64 acquires StreamRegistry {
        let registry = borrow_global<StreamRegistry>(@aptospay);
        registry.next_stream_id
    }
}
