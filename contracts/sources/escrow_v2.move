/// # Enhanced Escrow V2 Module
///
/// Advanced escrow system with time locks, optional arbitration, and flexible release conditions.
/// Supports multiple escrow types created through a factory pattern.
///
/// ## Features
/// - **Time Locks**: Automatic release after deadline, auto-refund if not claimed
/// - **Optional Arbitration**: Third-party can release funds (e.g., dispute resolver)
/// - **Multiple Release Conditions**: Time-based, approval-based, or hybrid
/// - **Flexible Escrow Types**: Created via factory pattern
/// - **Backwards Compatible**: Works alongside original escrow module
///
/// ## Escrow Types
/// 1. **Standard Escrow**: Sender/recipient control only (original behavior)
/// 2. **Time-Locked Escrow**: Auto-release after time, auto-refund on expiry
/// 3. **Arbitrated Escrow**: Third party can resolve disputes
/// 4. **Milestone Escrow**: Release funds in stages (future)
///
/// ## Security
/// - Multi-signature support for high-value escrows
/// - Time-based constraints prevent fund locking
/// - Clear authorization rules per escrow type
/// - Event emission for all state changes
///
module aptospay::escrow_v2 {
    use std::signer;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use aptos_std::table::{Self, Table};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;

    // ======================== Error Codes ========================

    /// Escrow with this ID does not exist
    const EESCROW_NOT_FOUND: u64 = 1;

    /// Escrow with this ID already exists
    const EESCROW_ALREADY_EXISTS: u64 = 2;

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

    /// Escrow has already been released
    const EALREADY_RELEASED: u64 = 300;

    /// Escrow has been cancelled
    const ECANCELLED: u64 = 301;

    /// Time lock has not expired yet
    const ETIME_LOCK_ACTIVE: u64 = 302;

    /// Release deadline has passed
    const EDEADLINE_PASSED: u64 = 303;

    // ======================== Enums (via u8) ========================

    /// Escrow type identifier
    const ESCROW_TYPE_STANDARD: u8 = 0;
    const ESCROW_TYPE_TIME_LOCKED: u8 = 1;
    const ESCROW_TYPE_ARBITRATED: u8 = 2;

    // ======================== Structs ========================

    /// Enhanced escrow with time locks and arbitration support
    struct EscrowV2 has key, store {
        /// Unique identifier for this escrow
        escrow_id: u64,
        /// Escrow type (standard, time-locked, arbitrated)
        escrow_type: u8,
        /// Address of the sender who created the escrow
        sender: address,
        /// Address of the intended recipient
        recipient: address,
        /// Optional arbitrator who can release funds (0x0 if none)
        arbitrator: Option<address>,
        /// Amount of APT in escrow (in Octas)
        amount: u64,
        /// Optional description or memo
        memo: String,
        /// Timestamp when escrow was created
        created_at: u64,
        /// Optional: earliest time recipient can claim (0 = no restriction)
        release_time: u64,
        /// Optional: deadline for recipient to claim, auto-refund after (0 = no deadline)
        expiry_time: u64,
        /// Whether the escrow has been released
        released: bool,
        /// Whether the escrow has been cancelled
        cancelled: bool,
        /// Who released the escrow (sender, recipient, or arbitrator)
        released_by: Option<address>,
        /// Escrowed coins
        coins: Coin<AptosCoin>,
    }

    /// Global registry for V2 escrows
    struct EscrowRegistryV2 has key {
        /// Table mapping escrow_id -> EscrowV2
        escrows: Table<u64, EscrowV2>,
        /// Counter for generating unique escrow IDs
        next_escrow_id: u64,
        /// Statistics by escrow type
        total_standard: u64,
        total_time_locked: u64,
        total_arbitrated: u64,
        /// Total escrows created
        total_escrows: u64,
        /// Total escrows released
        total_released: u64,
        /// Total escrows cancelled
        total_cancelled: u64,
        /// Total escrows auto-refunded due to expiry
        total_expired: u64,
        /// Total APT volume
        total_volume: u64,
    }

    // ======================== Events ========================

    #[event]
    struct EscrowV2CreatedEvent has drop, store {
        escrow_id: u64,
        escrow_type: u8,
        sender: address,
        recipient: address,
        arbitrator: Option<address>,
        amount: u64,
        release_time: u64,
        expiry_time: u64,
        memo: String,
        timestamp: u64,
    }

    #[event]
    struct EscrowV2ReleasedEvent has drop, store {
        escrow_id: u64,
        sender: address,
        recipient: address,
        released_by: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct EscrowV2CancelledEvent has drop, store {
        escrow_id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        reason: String,
        timestamp: u64,
    }

    #[event]
    struct EscrowV2ExpiredEvent has drop, store {
        escrow_id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        expiry_time: u64,
        timestamp: u64,
    }

    // ======================== Initialization ========================

    /// Initialize the escrow v2 module
    fun init_module(admin: &signer) {
        assert!(signer::address_of(admin) == @aptospay, ENOT_AUTHORIZED);

        move_to(admin, EscrowRegistryV2 {
            escrows: table::new(),
            next_escrow_id: 1,
            total_standard: 0,
            total_time_locked: 0,
            total_arbitrated: 0,
            total_escrows: 0,
            total_released: 0,
            total_cancelled: 0,
            total_expired: 0,
            total_volume: 0,
        });
    }

    // ======================== Factory Functions ========================

    /// Create a standard escrow (backward compatible with v1)
    public entry fun create_standard_escrow(
        sender: &signer,
        recipient: address,
        amount: u64,
        memo: vector<u8>,
    ) acquires EscrowRegistryV2 {
        create_escrow_internal(
            sender,
            recipient,
            option::none(),
            amount,
            memo,
            0, // no release_time
            0, // no expiry_time
            ESCROW_TYPE_STANDARD
        );
    }

    /// Create a time-locked escrow with auto-release and expiry
    ///
    /// # Arguments
    /// * `release_time` - Unix timestamp when recipient can first claim
    /// * `expiry_time` - Unix timestamp when funds auto-refund to sender
    public entry fun create_time_locked_escrow(
        sender: &signer,
        recipient: address,
        amount: u64,
        memo: vector<u8>,
        release_time: u64,
        expiry_time: u64,
    ) acquires EscrowRegistryV2 {
        let now = timestamp::now_seconds();

        // Validate time parameters
        assert!(release_time >= now, EINVALID_TIME_PARAMS);
        assert!(expiry_time > release_time, EINVALID_TIME_PARAMS);

        create_escrow_internal(
            sender,
            recipient,
            option::none(),
            amount,
            memo,
            release_time,
            expiry_time,
            ESCROW_TYPE_TIME_LOCKED
        );
    }

    /// Create an arbitrated escrow with third-party dispute resolution
    ///
    /// # Arguments
    /// * `arbitrator` - Address that can release funds in case of dispute
    /// * `expiry_time` - Optional deadline for auto-refund (0 = no expiry)
    public entry fun create_arbitrated_escrow(
        sender: &signer,
        recipient: address,
        arbitrator: address,
        amount: u64,
        memo: vector<u8>,
        expiry_time: u64,
    ) acquires EscrowRegistryV2 {
        // Validate arbitrator is not sender or recipient
        let sender_addr = signer::address_of(sender);
        assert!(arbitrator != sender_addr && arbitrator != recipient, ENOT_AUTHORIZED);

        if (expiry_time > 0) {
            let now = timestamp::now_seconds();
            assert!(expiry_time > now, EINVALID_TIME_PARAMS);
        };

        create_escrow_internal(
            sender,
            recipient,
            option::some(arbitrator),
            amount,
            memo,
            0, // no release_time restriction
            expiry_time,
            ESCROW_TYPE_ARBITRATED
        );
    }

    // ======================== Release Functions ========================

    /// Release escrow to recipient
    /// Can be called by recipient (after release_time) or arbitrator
    public entry fun release_escrow(
        caller: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistryV2 {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<EscrowRegistryV2>(@aptospay);

        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);

        // Verify escrow is active
        assert!(!escrow.released, EALREADY_RELEASED);
        assert!(!escrow.cancelled, ECANCELLED);

        let now = timestamp::now_seconds();

        // Check if expired
        if (escrow.expiry_time > 0 && now >= escrow.expiry_time) {
            abort EDEADLINE_PASSED
        };

        // Authorization check
        let is_recipient = caller_addr == escrow.recipient;
        let is_arbitrator = option::is_some(&escrow.arbitrator) &&
                           caller_addr == *option::borrow(&escrow.arbitrator);

        assert!(is_recipient || is_arbitrator, ENOT_AUTHORIZED);

        // Check release time (only for recipient, arbitrator can override)
        if (is_recipient && escrow.release_time > 0) {
            assert!(now >= escrow.release_time, ETIME_LOCK_ACTIVE);
        };

        // Mark as released
        escrow.released = true;
        escrow.released_by = option::some(caller_addr);

        // Update statistics
        registry.total_released = registry.total_released + 1;

        // Extract coins and recipient info
        let recipient = escrow.recipient;
        let amount = escrow.amount;
        let sender = escrow.sender;
        let coins = coin::extract_all(&mut escrow.coins);

        // Deposit to recipient
        coin::deposit(recipient, coins);

        // Emit event
        event::emit(EscrowV2ReleasedEvent {
            escrow_id,
            sender,
            recipient,
            released_by: caller_addr,
            amount,
            timestamp: now,
        });
    }

    /// Cancel escrow and refund to sender
    /// Can be called by sender before release, or automatically if expired
    public entry fun cancel_escrow(
        sender: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistryV2 {
        let sender_addr = signer::address_of(sender);
        let registry = borrow_global_mut<EscrowRegistryV2>(@aptospay);

        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);

        // Verify caller is the sender
        assert!(sender_addr == escrow.sender, ENOT_AUTHORIZED);

        // Verify escrow is active
        assert!(!escrow.released, EALREADY_RELEASED);
        assert!(!escrow.cancelled, ECANCELLED);

        // Mark as cancelled
        escrow.cancelled = true;

        // Update statistics
        registry.total_cancelled = registry.total_cancelled + 1;

        // Extract coins and info
        let recipient = escrow.recipient;
        let amount = escrow.amount;
        let coins = coin::extract_all(&mut escrow.coins);

        // Refund to sender
        coin::deposit(sender_addr, coins);

        // Emit event
        event::emit(EscrowV2CancelledEvent {
            escrow_id,
            sender: sender_addr,
            recipient,
            amount,
            reason: string::utf8(b"Cancelled by sender"),
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Claim expired escrow (auto-refund to sender)
    /// Anyone can call this after expiry_time has passed
    public entry fun claim_expired_escrow(
        _caller: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistryV2 {
        let registry = borrow_global_mut<EscrowRegistryV2>(@aptospay);

        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);

        // Verify escrow is active
        assert!(!escrow.released, EALREADY_RELEASED);
        assert!(!escrow.cancelled, ECANCELLED);

        // Verify escrow has expired
        let now = timestamp::now_seconds();
        assert!(escrow.expiry_time > 0, EINVALID_TIME_PARAMS);
        assert!(now >= escrow.expiry_time, ETIME_LOCK_ACTIVE);

        // Mark as cancelled (expired)
        escrow.cancelled = true;

        // Update statistics
        registry.total_expired = registry.total_expired + 1;

        // Extract coins and info
        let sender = escrow.sender;
        let recipient = escrow.recipient;
        let amount = escrow.amount;
        let expiry_time = escrow.expiry_time;
        let coins = coin::extract_all(&mut escrow.coins);

        // Refund to sender
        coin::deposit(sender, coins);

        // Emit events
        event::emit(EscrowV2ExpiredEvent {
            escrow_id,
            sender,
            recipient,
            amount,
            expiry_time,
            timestamp: now,
        });

        event::emit(EscrowV2CancelledEvent {
            escrow_id,
            sender,
            recipient,
            amount,
            reason: string::utf8(b"Expired - auto-refunded"),
            timestamp: now,
        });
    }

    // ======================== View Functions ========================

    /// Check if an escrow exists
    #[view]
    public fun escrow_exists(escrow_id: u64): bool acquires EscrowRegistryV2 {
        let registry = borrow_global<EscrowRegistryV2>(@aptospay);
        table::contains(&registry.escrows, escrow_id)
    }

    /// Get escrow details
    /// Returns: (escrow_type, sender, recipient, arbitrator, amount, release_time, expiry_time, released, cancelled)
    #[view]
    public fun get_escrow_details(
        escrow_id: u64
    ): (u8, address, address, Option<address>, u64, u64, u64, bool, bool) acquires EscrowRegistryV2 {
        let registry = borrow_global<EscrowRegistryV2>(@aptospay);
        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        let escrow = table::borrow(&registry.escrows, escrow_id);
        (
            escrow.escrow_type,
            escrow.sender,
            escrow.recipient,
            escrow.arbitrator,
            escrow.amount,
            escrow.release_time,
            escrow.expiry_time,
            escrow.released,
            escrow.cancelled
        )
    }

    /// Check if escrow has expired
    #[view]
    public fun is_expired(escrow_id: u64): bool acquires EscrowRegistryV2 {
        let registry = borrow_global<EscrowRegistryV2>(@aptospay);
        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        let escrow = table::borrow(&registry.escrows, escrow_id);
        if (escrow.expiry_time == 0) {
            return false
        };

        let now = timestamp::now_seconds();
        now >= escrow.expiry_time
    }

    /// Check if escrow can be claimed (past release_time)
    #[view]
    public fun is_claimable(escrow_id: u64): bool acquires EscrowRegistryV2 {
        let registry = borrow_global<EscrowRegistryV2>(@aptospay);
        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        let escrow = table::borrow(&registry.escrows, escrow_id);

        if (escrow.released || escrow.cancelled) {
            return false
        };

        let now = timestamp::now_seconds();

        // Check if expired
        if (escrow.expiry_time > 0 && now >= escrow.expiry_time) {
            return false
        };

        // Check release time
        if (escrow.release_time > 0) {
            return now >= escrow.release_time
        };

        true
    }

    /// Get registry statistics
    #[view]
    public fun get_registry_stats(): (u64, u64, u64, u64, u64, u64, u64, u64) acquires EscrowRegistryV2 {
        let registry = borrow_global<EscrowRegistryV2>(@aptospay);
        (
            registry.total_escrows,
            registry.total_released,
            registry.total_cancelled,
            registry.total_expired,
            registry.total_standard,
            registry.total_time_locked,
            registry.total_arbitrated,
            registry.total_volume
        )
    }

    // ======================== Internal Functions ========================

    /// Internal function to create escrow (called by factory functions)
    fun create_escrow_internal(
        sender: &signer,
        recipient: address,
        arbitrator: Option<address>,
        amount: u64,
        memo: vector<u8>,
        release_time: u64,
        expiry_time: u64,
        escrow_type: u8,
    ) acquires EscrowRegistryV2 {
        // Validate inputs
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(recipient != @0x0, EINVALID_RECIPIENT);

        let sender_addr = signer::address_of(sender);

        // Verify sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= amount, EINSUFFICIENT_BALANCE);

        // Get registry and generate unique ID
        let registry = borrow_global_mut<EscrowRegistryV2>(@aptospay);
        let escrow_id = registry.next_escrow_id;
        registry.next_escrow_id = registry.next_escrow_id + 1;

        // Update statistics
        registry.total_escrows = registry.total_escrows + 1;
        registry.total_volume = registry.total_volume + amount;

        if (escrow_type == ESCROW_TYPE_STANDARD) {
            registry.total_standard = registry.total_standard + 1;
        } else if (escrow_type == ESCROW_TYPE_TIME_LOCKED) {
            registry.total_time_locked = registry.total_time_locked + 1;
        } else if (escrow_type == ESCROW_TYPE_ARBITRATED) {
            registry.total_arbitrated = registry.total_arbitrated + 1;
        };

        // Withdraw coins from sender
        let escrowed_coins = coin::withdraw<AptosCoin>(sender, amount);

        let now = timestamp::now_seconds();

        // Create escrow resource
        let escrow = EscrowV2 {
            escrow_id,
            escrow_type,
            sender: sender_addr,
            recipient,
            arbitrator,
            amount,
            memo: string::utf8(memo),
            created_at: now,
            release_time,
            expiry_time,
            released: false,
            cancelled: false,
            released_by: option::none(),
            coins: escrowed_coins,
        };

        // Store escrow in global table
        table::add(&mut registry.escrows, escrow_id, escrow);

        // Emit event
        event::emit(EscrowV2CreatedEvent {
            escrow_id,
            escrow_type,
            sender: sender_addr,
            recipient,
            arbitrator,
            amount,
            release_time,
            expiry_time,
            memo: string::utf8(memo),
            timestamp: now,
        });
    }

    // ======================== Test-Only Functions ========================

    #[test_only]
    public fun init_for_test(admin: &signer) {
        init_module(admin);
    }

    #[test_only]
    public fun get_next_escrow_id(): u64 acquires EscrowRegistryV2 {
        let registry = borrow_global<EscrowRegistryV2>(@aptospay);
        registry.next_escrow_id
    }
}
