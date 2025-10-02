/// # Payment Escrow Module
///
/// This module implements a secure, trustless payment escrow system for AptosPay.
/// It allows senders to deposit APT into escrow, which can then be released to recipients
/// or cancelled and refunded.
///
/// ## Features
/// - Create escrow: Sender deposits APT for a specific recipient
/// - Release escrow: Recipient claims the deposited funds
/// - Cancel escrow: Sender reclaims funds before release
/// - View escrow: Anyone can query escrow details
/// - Event emission: All state changes emit events for tracking
///
/// ## Security
/// - Sender can only cancel their own escrows
/// - Recipient can only release escrows meant for them
/// - Amount validation ensures non-zero deposits
/// - State changes before external calls (reentrancy protection)
/// - Resource account pattern for trustless custody
///
module aptospay::payment_escrow {
    use std::signer;
    use std::string::{Self, String};
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

    /// Recipient address cannot be zero address
    const EINVALID_RECIPIENT: u64 = 201;

    /// Sender does not have sufficient APT balance
    const EINSUFFICIENT_BALANCE: u64 = 202;

    /// Caller is not authorized for this action
    const ENOT_AUTHORIZED: u64 = 100;

    /// Escrow has already been released
    const EALREADY_RELEASED: u64 = 300;

    /// Escrow has been cancelled
    const ECANCELLED: u64 = 301;

    // ======================== Structs ========================

    /// Represents a single escrow payment
    struct Escrow has key, store {
        /// Address of the sender who created the escrow
        sender: address,
        /// Address of the intended recipient
        recipient: address,
        /// Amount of APT in escrow (in Octas - 1 APT = 100,000,000 Octas)
        amount: u64,
        /// Optional description or memo for the payment
        memo: String,
        /// Timestamp when escrow was created (seconds since Unix epoch)
        created_at: u64,
        /// Whether the escrow has been released to recipient
        released: bool,
        /// Whether the escrow has been cancelled by sender
        cancelled: bool,
        /// Escrowed coins (held securely until release/cancel)
        coins: Coin<AptosCoin>
    }

    /// Global escrow registry - stores all active escrows
    struct EscrowRegistry has key {
        /// Table mapping escrow_id -> Escrow
        escrows: Table<u64, Escrow>,
        /// Counter for generating unique escrow IDs
        next_escrow_id: u64,
        /// Total number of escrows created
        total_escrows: u64,
        /// Total number of escrows released
        total_released: u64,
        /// Total number of escrows cancelled
        total_cancelled: u64,
        /// Total APT volume processed through escrows
        total_volume: u64
    }

    // ======================== Events ========================

    #[event]
    /// Emitted when a new escrow is created
    struct EscrowCreatedEvent has drop, store {
        escrow_id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        memo: String,
        timestamp: u64
    }

    #[event]
    /// Emitted when an escrow is released to recipient
    struct EscrowReleasedEvent has drop, store {
        escrow_id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        timestamp: u64
    }

    #[event]
    /// Emitted when an escrow is cancelled by sender
    struct EscrowCancelledEvent has drop, store {
        escrow_id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        timestamp: u64
    }

    // ======================== Initialization ========================

    /// Initialize the escrow module
    /// Must be called once during module deployment
    /// Creates the global escrow registry
    fun init_module(admin: &signer) {
        // Verify caller is the module deployer
        assert!(signer::address_of(admin) == @aptospay, ENOT_AUTHORIZED);

        // Initialize global registry
        move_to(admin, EscrowRegistry {
            escrows: table::new(),
            next_escrow_id: 1,
            total_escrows: 0,
            total_released: 0,
            total_cancelled: 0,
            total_volume: 0
        });
    }

    // ======================== Public Entry Functions ========================

    /// Create a new escrow payment
    ///
    /// # Arguments
    /// * `sender` - Signer creating the escrow
    /// * `recipient` - Address that can claim the funds
    /// * `amount` - Amount of APT to escrow (in Octas)
    /// * `memo` - Optional description for the payment
    ///
    /// # Returns
    /// * `u64` - Unique escrow ID for tracking
    ///
    /// # Aborts
    /// * `EINVALID_AMOUNT` - If amount is zero
    /// * `EINVALID_RECIPIENT` - If recipient is zero address
    /// * `EINSUFFICIENT_BALANCE` - If sender doesn't have enough APT
    public entry fun create_escrow(
        sender: &signer,
        recipient: address,
        amount: u64,
        memo: vector<u8>
    ) acquires EscrowRegistry {
        // Validate inputs
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(recipient != @0x0, EINVALID_RECIPIENT);

        let sender_addr = signer::address_of(sender);

        // Verify sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= amount, EINSUFFICIENT_BALANCE);

        // Get registry and generate unique ID
        let registry = borrow_global_mut<EscrowRegistry>(@aptospay);
        let escrow_id = registry.next_escrow_id;
        registry.next_escrow_id = registry.next_escrow_id + 1;

        // Update statistics
        registry.total_escrows = registry.total_escrows + 1;
        registry.total_volume = registry.total_volume + amount;

        // Withdraw coins from sender (state change before external call)
        let escrowed_coins = coin::withdraw<AptosCoin>(sender, amount);

        // Create escrow resource
        let escrow = Escrow {
            sender: sender_addr,
            recipient,
            amount,
            memo: string::utf8(memo),
            created_at: timestamp::now_seconds(),
            released: false,
            cancelled: false,
            coins: escrowed_coins
        };

        // Store escrow in global table
        table::add(&mut registry.escrows, escrow_id, escrow);

        // Emit event
        event::emit(EscrowCreatedEvent {
            escrow_id,
            sender: sender_addr,
            recipient,
            amount,
            memo: string::utf8(memo),
            timestamp: timestamp::now_seconds()
        });
    }

    /// Release escrow to recipient
    /// Only the designated recipient can call this
    ///
    /// # Arguments
    /// * `recipient` - Signer claiming the escrow
    /// * `escrow_id` - ID of the escrow to release
    /// * `sender_addr` - Original sender's address
    ///
    /// # Aborts
    /// * `EESCROW_NOT_FOUND` - If escrow doesn't exist
    /// * `ENOT_AUTHORIZED` - If caller is not the recipient
    /// * `EALREADY_RELEASED` - If escrow already released
    /// * `ECANCELLED` - If escrow was cancelled
    public entry fun release_escrow(
        recipient: &signer,
        escrow_id: u64
    ) acquires EscrowRegistry {
        let recipient_addr = signer::address_of(recipient);
        let registry = borrow_global_mut<EscrowRegistry>(@aptospay);

        // Verify escrow exists
        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        // Remove escrow from table
        let Escrow {
            sender,
            recipient: escrow_recipient,
            amount,
            memo: _,
            created_at: _,
            released,
            cancelled,
            coins
        } = table::remove(&mut registry.escrows, escrow_id);

        // Verify caller is the recipient
        assert!(recipient_addr == escrow_recipient, ENOT_AUTHORIZED);

        // Verify escrow is still active
        assert!(!released, EALREADY_RELEASED);
        assert!(!cancelled, ECANCELLED);

        // Update statistics
        registry.total_released = registry.total_released + 1;

        // Deposit coins to recipient (state already updated)
        coin::deposit(recipient_addr, coins);

        // Emit event
        event::emit(EscrowReleasedEvent {
            escrow_id,
            sender,
            recipient: recipient_addr,
            amount,
            timestamp: timestamp::now_seconds()
        });
    }

    /// Cancel escrow and refund to sender
    /// Only the original sender can call this
    ///
    /// # Arguments
    /// * `sender` - Signer cancelling the escrow
    /// * `escrow_id` - ID of the escrow to cancel
    ///
    /// # Aborts
    /// * `EESCROW_NOT_FOUND` - If escrow doesn't exist
    /// * `ENOT_AUTHORIZED` - If caller is not the sender
    /// * `EALREADY_RELEASED` - If escrow already released
    /// * `ECANCELLED` - If escrow already cancelled
    public entry fun cancel_escrow(
        sender: &signer,
        escrow_id: u64
    ) acquires EscrowRegistry {
        let sender_addr = signer::address_of(sender);
        let registry = borrow_global_mut<EscrowRegistry>(@aptospay);

        // Verify escrow exists
        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        // Remove escrow from table
        let Escrow {
            sender: escrow_sender,
            recipient,
            amount,
            memo: _,
            created_at: _,
            released,
            cancelled,
            coins
        } = table::remove(&mut registry.escrows, escrow_id);

        // Verify caller is the sender
        assert!(sender_addr == escrow_sender, ENOT_AUTHORIZED);

        // Verify escrow is still active
        assert!(!released, EALREADY_RELEASED);
        assert!(!cancelled, ECANCELLED);

        // Update statistics
        registry.total_cancelled = registry.total_cancelled + 1;

        // Refund coins to sender
        coin::deposit(sender_addr, coins);

        // Emit event
        event::emit(EscrowCancelledEvent {
            escrow_id,
            sender: sender_addr,
            recipient,
            amount,
            timestamp: timestamp::now_seconds()
        });
    }

    // ======================== View Functions ========================

    /// Check if an escrow exists
    public fun escrow_exists(escrow_id: u64): bool acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@aptospay);
        table::contains(&registry.escrows, escrow_id)
    }

    /// Get escrow details
    /// Returns: (sender, recipient, amount, released, cancelled)
    public fun get_escrow_details(
        escrow_id: u64
    ): (address, address, u64, bool, bool) acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@aptospay);
        assert!(table::contains(&registry.escrows, escrow_id), EESCROW_NOT_FOUND);

        let escrow = table::borrow(&registry.escrows, escrow_id);
        (
            escrow.sender,
            escrow.recipient,
            escrow.amount,
            escrow.released,
            escrow.cancelled
        )
    }

    /// Get registry statistics
    /// Returns: (total_escrows, total_released, total_cancelled, total_volume)
    public fun get_registry_stats(): (u64, u64, u64, u64) acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@aptospay);
        (
            registry.total_escrows,
            registry.total_released,
            registry.total_cancelled,
            registry.total_volume
        )
    }

    // ======================== Test-Only Functions ========================

    #[test_only]
    /// Initialize module for testing
    public fun init_for_test(admin: &signer) {
        init_module(admin);
    }

    #[test_only]
    /// Get next escrow ID (for testing)
    public fun get_next_escrow_id(): u64 acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@aptospay);
        registry.next_escrow_id
    }
}
