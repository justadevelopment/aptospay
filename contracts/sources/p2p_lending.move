/// # P2P Lending Protocol
///
/// Implements a hybrid pool-based lending system with over-collateralized loans, dynamic interest rates,
/// oracle-based price feeds, and automated liquidations.
///
/// ## Features
/// - Supply assets to earn interest (liquidity providers)
/// - Borrow assets against collateral (over-collateralized)
/// - Dynamic interest rates based on utilization
/// - Oracle-based price feeds for accurate valuations
/// - Automated liquidation mechanism with liquidator incentives
/// - Health factor monitoring for position safety
///
/// ## Use Cases
/// - Earn yield on idle APT/USDC
/// - Borrow USDC against APT collateral
/// - Liquidate unhealthy positions for profit
/// - DeFi composability (collateral for other protocols)
///
/// ## Math
/// Interest rate formula (utilization-based):
/// ```
/// utilization = total_borrowed / total_liquidity
/// if utilization <= optimal:
///     borrow_rate = base_rate + (utilization / optimal) * slope1
/// else:
///     borrow_rate = base_rate + slope1 + ((utilization - optimal) / (1 - optimal)) * slope2
/// supply_rate = borrow_rate * utilization * (1 - reserve_factor)
/// ```
///
/// Health factor formula:
/// ```
/// health_factor = (collateral_value * liquidation_threshold) / total_debt
/// if health_factor < 1.0: position is liquidatable
/// if health_factor >= 1.0: position is healthy
/// ```
///
module aptospay::p2p_lending {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};
    use aptos_std::type_info::{Self, TypeInfo};

    // ======================== Error Codes ========================

    /// Pool with this type does not exist
    const EPOOL_NOT_FOUND: u64 = 1;

    /// Pool with this type already exists
    const EPOOL_ALREADY_EXISTS: u64 = 2;

    /// User position does not exist
    const EPOSITION_NOT_FOUND: u64 = 3;

    /// Amount must be greater than zero
    const EINVALID_AMOUNT: u64 = 200;

    /// Invalid interest rate parameters
    const EINVALID_RATE_PARAMS: u64 = 201;

    /// Invalid liquidation parameters
    const EINVALID_LIQUIDATION_PARAMS: u64 = 202;

    /// Insufficient liquidity in pool
    const EINSUFFICIENT_LIQUIDITY: u64 = 203;

    /// Insufficient collateral for borrow
    const EINSUFFICIENT_COLLATERAL: u64 = 204;

    /// User does not have sufficient balance
    const EINSUFFICIENT_BALANCE: u64 = 205;

    /// User does not have sufficient supplied amount
    const EINSUFFICIENT_SUPPLIED: u64 = 206;

    /// Caller is not authorized for this action
    const ENOT_AUTHORIZED: u64 = 100;

    /// Position health factor is above liquidation threshold
    const EPOSITION_HEALTHY: u64 = 300;

    /// Position health factor is below minimum
    const EPOSITION_UNHEALTHY: u64 = 301;

    /// Repay amount exceeds borrowed amount
    const EREPAY_EXCEEDS_DEBT: u64 = 302;

    /// Withdraw amount exceeds supplied amount
    const EWITHDRAW_EXCEEDS_SUPPLIED: u64 = 303;

    /// Price oracle data is too old
    const EPRICE_TOO_OLD: u64 = 400;

    /// Invalid price from oracle
    const EINVALID_PRICE: u64 = 401;

    // ======================== Constants ========================

    /// Basis points precision (10000 = 100%)
    const BASIS_POINTS: u64 = 10000;

    /// 18 decimal precision for index calculations
    const PRECISION_18: u128 = 1000000000000000000; // 1e18

    /// 8 decimal precision for prices (matches Pyth)
    const PRECISION_8: u64 = 100000000; // 1e8

    /// Seconds per year for APR calculations
    const SECONDS_PER_YEAR: u64 = 31536000;

    /// Default optimal utilization (80%)
    const DEFAULT_OPTIMAL_UTILIZATION: u64 = 8000; // 80% in basis points

    /// Default base rate (0%)
    const DEFAULT_BASE_RATE: u64 = 0;

    /// Default rate slope 1 (10% APR at optimal)
    const DEFAULT_RATE_SLOPE1: u64 = 1000; // 10% in basis points

    /// Default rate slope 2 (100% APR at 100% utilization)
    const DEFAULT_RATE_SLOPE2: u64 = 10000; // 100% in basis points

    /// Default reserve factor (10%)
    const DEFAULT_RESERVE_FACTOR: u64 = 1000; // 10% in basis points

    /// Default liquidation threshold (80%)
    const DEFAULT_LIQUIDATION_THRESHOLD: u64 = 8000; // 80% in basis points

    /// Default LTV ratio (75%)
    const DEFAULT_LTV_RATIO: u64 = 7500; // 75% in basis points

    /// Default liquidation bonus (5%)
    const DEFAULT_LIQUIDATION_BONUS: u64 = 500; // 5% in basis points

    /// Maximum price age (5 minutes)
    const MAX_PRICE_AGE: u64 = 300; // seconds

    /// Minimum health factor (1.0 in 18 decimals)
    const MIN_HEALTH_FACTOR: u128 = 1000000000000000000; // 1e18

    // ======================== Structs ========================

    /// Represents a lending pool for a specific asset type
    struct LendingPool has key, store {
        /// Type of the asset (for identification)
        asset_type: TypeInfo,
        /// Total liquidity supplied by users (in asset units)
        total_liquidity: u64,
        /// Total amount currently borrowed (in asset units)
        total_borrowed: u64,
        /// Current borrow rate (basis points per year)
        current_borrow_rate: u64,
        /// Current supply rate (basis points per year)
        current_supply_rate: u64,
        /// Last timestamp when rates were updated
        last_update_timestamp: u64,
        /// Borrow index (18 decimal precision, starts at 1e18)
        borrow_index: u128,
        /// Supply index (18 decimal precision, starts at 1e18)
        supply_index: u128,
        /// Optimal utilization rate (basis points)
        optimal_utilization: u64,
        /// Base borrow rate (basis points per year)
        base_rate: u64,
        /// Rate slope 1 (basis points per year)
        rate_slope1: u64,
        /// Rate slope 2 (basis points per year)
        rate_slope2: u64,
        /// Reserve factor (basis points)
        reserve_factor: u64,
        /// Total reserves accumulated (protocol fees)
        total_reserves: u64,
        /// Escrowed coins for the pool
        pool_coins: Coin<AptosCoin>,
    }

    /// Represents a user's position (supply + borrow + collateral)
    struct UserPosition has key, store {
        /// User's address
        user: address,
        /// Amount supplied to lending pool (in asset units)
        supplied_amount: u64,
        /// Supply index checkpoint (for interest calculation)
        supply_index_checkpoint: u128,
        /// Amount borrowed from pool (in asset units)
        borrowed_amount: u64,
        /// Borrow index checkpoint (for interest calculation)
        borrow_index_checkpoint: u128,
        /// Collateral amount deposited (in APT)
        collateral_amount: u64,
        /// Last recorded collateral price (8 decimals)
        collateral_price_checkpoint: u64,
        /// Health factor (18 decimals, > 1e18 is healthy)
        health_factor: u128,
        /// Liquidation threshold (basis points)
        liquidation_threshold: u64,
        /// Last interaction timestamp
        last_interaction: u64,
    }

    /// Global registry of all user positions
    struct PositionRegistry has key {
        /// Table mapping user_address -> UserPosition
        positions: Table<address, UserPosition>,
        /// Total number of positions
        total_positions: u64,
        /// Total suppliers
        total_suppliers: u64,
        /// Total borrowers
        total_borrowers: u64,
    }

    /// Price oracle for asset valuations
    struct PriceOracle has key {
        /// APT/USD price (8 decimal precision)
        apt_price: u64,
        /// USDC/USD price (8 decimal precision, typically 1.0)
        usdc_price: u64,
        /// Last update timestamp
        last_update: u64,
        /// Maximum allowed age for price data
        max_price_age: u64,
    }

    /// Global lending protocol registry
    struct LendingRegistry has key {
        /// Table mapping TypeInfo -> pool_exists flag
        pools: Table<TypeInfo, bool>,
        /// Total number of pools created
        total_pools: u64,
        /// Total volume supplied (in USD, 8 decimals)
        total_volume_supplied: u128,
        /// Total volume borrowed (in USD, 8 decimals)
        total_volume_borrowed: u128,
        /// Total liquidations executed
        total_liquidations: u64,
    }

    // ======================== Events ========================

    #[event]
    /// Emitted when a pool is created
    struct PoolCreatedEvent has drop, store {
        asset_type: TypeInfo,
        optimal_utilization: u64,
        base_rate: u64,
        rate_slope1: u64,
        rate_slope2: u64,
        reserve_factor: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when user supplies assets
    struct SupplyEvent has drop, store {
        user: address,
        asset_type: TypeInfo,
        amount: u64,
        new_supply_index: u128,
        timestamp: u64,
    }

    #[event]
    /// Emitted when user withdraws assets
    struct WithdrawEvent has drop, store {
        user: address,
        asset_type: TypeInfo,
        amount: u64,
        new_supply_index: u128,
        timestamp: u64,
    }

    #[event]
    /// Emitted when user borrows assets
    struct BorrowEvent has drop, store {
        user: address,
        asset_type: TypeInfo,
        collateral_amount: u64,
        borrow_amount: u64,
        health_factor: u128,
        new_borrow_index: u128,
        timestamp: u64,
    }

    #[event]
    /// Emitted when user repays borrowed assets
    struct RepayEvent has drop, store {
        user: address,
        asset_type: TypeInfo,
        repay_amount: u64,
        remaining_debt: u64,
        new_borrow_index: u128,
        timestamp: u64,
    }

    #[event]
    /// Emitted when a position is liquidated
    struct LiquidationEvent has drop, store {
        liquidator: address,
        borrower: address,
        asset_type: TypeInfo,
        repay_amount: u64,
        collateral_seized: u64,
        liquidation_bonus: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when interest rates are updated
    struct RateUpdateEvent has drop, store {
        asset_type: TypeInfo,
        utilization: u64,
        borrow_rate: u64,
        supply_rate: u64,
        borrow_index: u128,
        supply_index: u128,
        timestamp: u64,
    }

    #[event]
    /// Emitted when price oracle is updated
    struct PriceUpdateEvent has drop, store {
        apt_price: u64,
        usdc_price: u64,
        timestamp: u64,
    }

    // ======================== Initialization ========================

    /// Initialize the lending protocol
    /// Must be called once during module deployment
    fun init_module(admin: &signer) {
        assert!(signer::address_of(admin) == @aptospay, ENOT_AUTHORIZED);

        // Initialize lending registry
        move_to(admin, LendingRegistry {
            pools: table::new(),
            total_pools: 0,
            total_volume_supplied: 0,
            total_volume_borrowed: 0,
            total_liquidations: 0,
        });

        // Initialize position registry
        move_to(admin, PositionRegistry {
            positions: table::new(),
            total_positions: 0,
            total_suppliers: 0,
            total_borrowers: 0,
        });

        // Initialize price oracle with default 1:1 prices
        move_to(admin, PriceOracle {
            apt_price: PRECISION_8, // $1.00 (placeholder)
            usdc_price: PRECISION_8, // $1.00 (stable)
            last_update: timestamp::now_seconds(),
            max_price_age: MAX_PRICE_AGE,
        });
    }

    // ======================== Public Entry Functions ========================

    /// Create a new lending pool for APT
    ///
    /// # Arguments
    /// * `admin` - Signer with admin privileges
    ///
    /// # Aborts
    /// * `ENOT_AUTHORIZED` - If caller is not admin
    /// * `EPOOL_ALREADY_EXISTS` - If pool already exists
    public entry fun create_apt_pool(
        admin: &signer,
    ) acquires LendingRegistry {
        assert!(signer::address_of(admin) == @aptospay, ENOT_AUTHORIZED);

        let asset_type = type_info::type_of<AptosCoin>();
        let registry = borrow_global_mut<LendingRegistry>(@aptospay);

        // Check if pool already exists
        assert!(!table::contains(&registry.pools, asset_type), EPOOL_ALREADY_EXISTS);

        // Create pool with default parameters
        let pool = LendingPool {
            asset_type,
            total_liquidity: 0,
            total_borrowed: 0,
            current_borrow_rate: DEFAULT_BASE_RATE,
            current_supply_rate: 0,
            last_update_timestamp: timestamp::now_seconds(),
            borrow_index: PRECISION_18,
            supply_index: PRECISION_18,
            optimal_utilization: DEFAULT_OPTIMAL_UTILIZATION,
            base_rate: DEFAULT_BASE_RATE,
            rate_slope1: DEFAULT_RATE_SLOPE1,
            rate_slope2: DEFAULT_RATE_SLOPE2,
            reserve_factor: DEFAULT_RESERVE_FACTOR,
            total_reserves: 0,
            pool_coins: coin::zero<AptosCoin>(),
        };

        // Store pool under module address
        move_to(admin, pool);

        // Mark pool as created in registry
        table::add(&mut registry.pools, asset_type, true);
        registry.total_pools = registry.total_pools + 1;

        // Emit event
        event::emit(PoolCreatedEvent {
            asset_type,
            optimal_utilization: DEFAULT_OPTIMAL_UTILIZATION,
            base_rate: DEFAULT_BASE_RATE,
            rate_slope1: DEFAULT_RATE_SLOPE1,
            rate_slope2: DEFAULT_RATE_SLOPE2,
            reserve_factor: DEFAULT_RESERVE_FACTOR,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Supply APT to the lending pool to earn interest
    ///
    /// # Arguments
    /// * `account` - Signer supplying assets
    /// * `amount` - Amount to supply (in Octas)
    ///
    /// # Aborts
    /// * `EINVALID_AMOUNT` - If amount is zero
    /// * `EPOOL_NOT_FOUND` - If lending pool doesn't exist
    /// * `EINSUFFICIENT_BALANCE` - If user doesn't have enough APT
    public entry fun supply(
        account: &signer,
        amount: u64,
    ) acquires LendingPool, PositionRegistry, LendingRegistry {
        assert!(amount > 0, EINVALID_AMOUNT);

        let user_addr = signer::address_of(account);
        let asset_type = type_info::type_of<AptosCoin>();

        // Verify pool exists
        assert!(exists<LendingPool>(@aptospay), EPOOL_NOT_FOUND);

        // Update interest rates before modifying pool
        update_interest_rates();

        let pool = borrow_global_mut<LendingPool>(@aptospay);

        // Verify user has sufficient balance
        let user_balance = coin::balance<AptosCoin>(user_addr);
        assert!(user_balance >= amount, EINSUFFICIENT_BALANCE);

        // Withdraw coins from user
        let supplied_coins = coin::withdraw<AptosCoin>(account, amount);

        // Merge into pool
        coin::merge(&mut pool.pool_coins, supplied_coins);

        // Update pool liquidity
        pool.total_liquidity = pool.total_liquidity + amount;

        // Recalculate rates based on new utilization
        recalculate_rates_internal(pool);

        // Get or create user position
        let position_registry = borrow_global_mut<PositionRegistry>(@aptospay);

        if (!table::contains(&position_registry.positions, user_addr)) {
            // Create new position
            let position = UserPosition {
                user: user_addr,
                supplied_amount: amount,
                supply_index_checkpoint: pool.supply_index,
                borrowed_amount: 0,
                borrow_index_checkpoint: pool.borrow_index,
                collateral_amount: 0,
                collateral_price_checkpoint: 0,
                health_factor: 0, // No borrowing yet
                liquidation_threshold: DEFAULT_LIQUIDATION_THRESHOLD,
                last_interaction: timestamp::now_seconds(),
            };
            table::add(&mut position_registry.positions, user_addr, position);
            position_registry.total_positions = position_registry.total_positions + 1;
            position_registry.total_suppliers = position_registry.total_suppliers + 1;
        } else {
            // Update existing position with accrued interest
            let position = table::borrow_mut(&mut position_registry.positions, user_addr);

            // Calculate accrued interest
            let accrued_interest = (((position.supplied_amount as u128) * pool.supply_index) / position.supply_index_checkpoint) as u64;

            // Update supplied amount with interest
            position.supplied_amount = accrued_interest + amount;
            position.supply_index_checkpoint = pool.supply_index;
            position.last_interaction = timestamp::now_seconds();
        };

        // Update registry statistics
        let lending_registry = borrow_global_mut<LendingRegistry>(@aptospay);
        lending_registry.total_volume_supplied = lending_registry.total_volume_supplied + (amount as u128);

        // Emit event
        event::emit(SupplyEvent {
            user: user_addr,
            asset_type,
            amount,
            new_supply_index: pool.supply_index,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Withdraw supplied APT from the lending pool
    ///
    /// # Arguments
    /// * `account` - Signer withdrawing assets
    /// * `amount` - Amount to withdraw (in Octas)
    ///
    /// # Aborts
    /// * `EINVALID_AMOUNT` - If amount is zero
    /// * `EPOOL_NOT_FOUND` - If lending pool doesn't exist
    /// * `EPOSITION_NOT_FOUND` - If user has no position
    /// * `EWITHDRAW_EXCEEDS_SUPPLIED` - If withdraw amount exceeds supplied amount
    /// * `EINSUFFICIENT_LIQUIDITY` - If pool doesn't have enough liquidity
    public entry fun withdraw(
        account: &signer,
        amount: u64,
    ) acquires LendingPool, PositionRegistry {
        assert!(amount > 0, EINVALID_AMOUNT);

        let user_addr = signer::address_of(account);
        let asset_type = type_info::type_of<AptosCoin>();

        // Verify pool exists
        assert!(exists<LendingPool>(@aptospay), EPOOL_NOT_FOUND);

        // Update interest rates before modifying pool
        update_interest_rates();

        let pool = borrow_global_mut<LendingPool>(@aptospay);

        // Get user position
        let position_registry = borrow_global_mut<PositionRegistry>(@aptospay);
        assert!(table::contains(&position_registry.positions, user_addr), EPOSITION_NOT_FOUND);

        let position = table::borrow_mut(&mut position_registry.positions, user_addr);

        // Calculate current supplied amount with accrued interest
        // current_supplied = supplied_amount * (current_index / checkpoint_index)
        let current_supplied = (((position.supplied_amount as u128) * pool.supply_index) / position.supply_index_checkpoint) as u64;

        // Verify user has enough supplied
        assert!(current_supplied >= amount, EWITHDRAW_EXCEEDS_SUPPLIED);

        // Verify pool has enough liquidity (total_liquidity - total_borrowed)
        let available_liquidity = pool.total_liquidity - pool.total_borrowed;
        assert!(available_liquidity >= amount, EINSUFFICIENT_LIQUIDITY);

        // Extract coins from pool
        let withdraw_coins = coin::extract(&mut pool.pool_coins, amount);

        // Deposit to user
        coin::deposit(user_addr, withdraw_coins);

        // Update pool liquidity
        pool.total_liquidity = pool.total_liquidity - amount;

        // Update user position
        position.supplied_amount = current_supplied - amount;
        position.supply_index_checkpoint = pool.supply_index;
        position.last_interaction = timestamp::now_seconds();

        // Recalculate rates based on new utilization
        recalculate_rates_internal(pool);

        // Emit event
        event::emit(WithdrawEvent {
            user: user_addr,
            asset_type,
            amount,
            new_supply_index: pool.supply_index,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Borrow APT against collateral
    ///
    /// # Arguments
    /// * `account` - Signer borrowing assets
    /// * `collateral_amount` - Amount of collateral to deposit (in Octas)
    /// * `borrow_amount` - Amount to borrow (in Octas)
    ///
    /// # Aborts
    /// * `EINVALID_AMOUNT` - If amounts are zero
    /// * `EPOOL_NOT_FOUND` - If lending pool doesn't exist
    /// * `EINSUFFICIENT_COLLATERAL` - If collateral insufficient for borrow
    /// * `EINSUFFICIENT_LIQUIDITY` - If pool doesn't have enough liquidity
    /// * `EPOSITION_UNHEALTHY` - If resulting health factor is too low
    public entry fun borrow(
        account: &signer,
        collateral_amount: u64,
        borrow_amount: u64,
    ) acquires LendingPool, PositionRegistry, PriceOracle, LendingRegistry {
        assert!(collateral_amount > 0, EINVALID_AMOUNT);
        assert!(borrow_amount > 0, EINVALID_AMOUNT);

        let user_addr = signer::address_of(account);
        let asset_type = type_info::type_of<AptosCoin>();

        // Verify pool exists
        assert!(exists<LendingPool>(@aptospay), EPOOL_NOT_FOUND);

        // Update interest rates before modifying pool
        update_interest_rates();

        let pool = borrow_global_mut<LendingPool>(@aptospay);

        // Verify pool has enough liquidity
        let available_liquidity = pool.total_liquidity - pool.total_borrowed;
        assert!(available_liquidity >= borrow_amount, EINSUFFICIENT_LIQUIDITY);

        // Verify user has sufficient balance for collateral
        let user_balance = coin::balance<AptosCoin>(user_addr);
        assert!(user_balance >= collateral_amount, EINSUFFICIENT_BALANCE);

        // Withdraw collateral from user
        let collateral_coins = coin::withdraw<AptosCoin>(account, collateral_amount);

        // Merge collateral into pool
        coin::merge(&mut pool.pool_coins, collateral_coins);

        // Get or create user position
        let position_registry = borrow_global_mut<PositionRegistry>(@aptospay);

        if (!table::contains(&position_registry.positions, user_addr)) {
            // Create new position with borrow
            let oracle = borrow_global<PriceOracle>(@aptospay);

            let position = UserPosition {
                user: user_addr,
                supplied_amount: 0,
                supply_index_checkpoint: pool.supply_index,
                borrowed_amount: borrow_amount,
                borrow_index_checkpoint: pool.borrow_index,
                collateral_amount,
                collateral_price_checkpoint: oracle.apt_price,
                health_factor: 0, // Will be calculated below
                liquidation_threshold: DEFAULT_LIQUIDATION_THRESHOLD,
                last_interaction: timestamp::now_seconds(),
            };
            table::add(&mut position_registry.positions, user_addr, position);
            position_registry.total_positions = position_registry.total_positions + 1;
            position_registry.total_borrowers = position_registry.total_borrowers + 1;
        } else {
            // Update existing position
            let position = table::borrow_mut(&mut position_registry.positions, user_addr);
            let oracle = borrow_global<PriceOracle>(@aptospay);

            // Calculate accrued borrow interest
            let accrued_debt = (((position.borrowed_amount as u128) * pool.borrow_index) / position.borrow_index_checkpoint) as u64;

            // Update borrowed amount with interest
            position.borrowed_amount = accrued_debt + borrow_amount;
            position.borrow_index_checkpoint = pool.borrow_index;
            position.collateral_amount = position.collateral_amount + collateral_amount;
            position.collateral_price_checkpoint = oracle.apt_price;
            position.last_interaction = timestamp::now_seconds();
        };

        // Calculate health factor
        let position = table::borrow(&position_registry.positions, user_addr);
        let health_factor = calculate_health_factor_internal(position);

        // Verify health factor is above minimum
        assert!(health_factor >= MIN_HEALTH_FACTOR, EPOSITION_UNHEALTHY);

        // Update position health factor
        let position = table::borrow_mut(&mut position_registry.positions, user_addr);
        position.health_factor = health_factor;

        // Update pool borrowed amount
        pool.total_borrowed = pool.total_borrowed + borrow_amount;

        // Extract borrowed coins from pool
        let borrow_coins = coin::extract(&mut pool.pool_coins, borrow_amount);

        // Deposit borrowed coins to user
        coin::deposit(user_addr, borrow_coins);

        // Recalculate rates based on new utilization
        recalculate_rates_internal(pool);

        // Update registry statistics
        let lending_registry = borrow_global_mut<LendingRegistry>(@aptospay);
        lending_registry.total_volume_borrowed = lending_registry.total_volume_borrowed + (borrow_amount as u128);

        // Emit event
        event::emit(BorrowEvent {
            user: user_addr,
            asset_type,
            collateral_amount,
            borrow_amount,
            health_factor,
            new_borrow_index: pool.borrow_index,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Repay borrowed APT
    ///
    /// # Arguments
    /// * `account` - Signer repaying debt
    /// * `amount` - Amount to repay (in Octas)
    ///
    /// # Aborts
    /// * `EINVALID_AMOUNT` - If amount is zero
    /// * `EPOOL_NOT_FOUND` - If lending pool doesn't exist
    /// * `EPOSITION_NOT_FOUND` - If user has no position
    /// * `EREPAY_EXCEEDS_DEBT` - If repay amount exceeds borrowed amount
    /// * `EINSUFFICIENT_BALANCE` - If user doesn't have enough APT
    public entry fun repay(
        account: &signer,
        amount: u64,
    ) acquires LendingPool, PositionRegistry, PriceOracle {
        assert!(amount > 0, EINVALID_AMOUNT);

        let user_addr = signer::address_of(account);
        let asset_type = type_info::type_of<AptosCoin>();

        // Verify pool exists
        assert!(exists<LendingPool>(@aptospay), EPOOL_NOT_FOUND);

        // Update interest rates before modifying pool
        update_interest_rates();

        let pool = borrow_global_mut<LendingPool>(@aptospay);

        // Get user position
        let position_registry = borrow_global_mut<PositionRegistry>(@aptospay);
        assert!(table::contains(&position_registry.positions, user_addr), EPOSITION_NOT_FOUND);

        let position = table::borrow_mut(&mut position_registry.positions, user_addr);

        // Calculate current debt with accrued interest
        let current_debt = (((position.borrowed_amount as u128) * pool.borrow_index) / position.borrow_index_checkpoint) as u64;

        // Verify repay amount doesn't exceed debt
        assert!(amount <= current_debt, EREPAY_EXCEEDS_DEBT);

        // Verify user has sufficient balance
        let user_balance = coin::balance<AptosCoin>(user_addr);
        assert!(user_balance >= amount, EINSUFFICIENT_BALANCE);

        // Withdraw repayment from user
        let repay_coins = coin::withdraw<AptosCoin>(account, amount);

        // Merge into pool
        coin::merge(&mut pool.pool_coins, repay_coins);

        // Update pool borrowed amount
        pool.total_borrowed = pool.total_borrowed - amount;

        // Update user position
        position.borrowed_amount = current_debt - amount;
        position.borrow_index_checkpoint = pool.borrow_index;
        position.last_interaction = timestamp::now_seconds();

        // Recalculate health factor
        let health_factor = calculate_health_factor_internal(position);
        position.health_factor = health_factor;

        // Recalculate rates based on new utilization
        recalculate_rates_internal(pool);

        // Emit event
        event::emit(RepayEvent {
            user: user_addr,
            asset_type,
            repay_amount: amount,
            remaining_debt: position.borrowed_amount,
            new_borrow_index: pool.borrow_index,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Liquidate an unhealthy position
    ///
    /// # Arguments
    /// * `liquidator` - Signer executing liquidation
    /// * `borrower` - Address of borrower to liquidate
    /// * `repay_amount` - Amount of debt to repay (in Octas)
    ///
    /// # Aborts
    /// * `EINVALID_AMOUNT` - If amount is zero
    /// * `EPOOL_NOT_FOUND` - If lending pool doesn't exist
    /// * `EPOSITION_NOT_FOUND` - If borrower has no position
    /// * `EPOSITION_HEALTHY` - If position health factor is above threshold
    /// * `EINSUFFICIENT_BALANCE` - If liquidator doesn't have enough APT
    public entry fun liquidate(
        liquidator: &signer,
        borrower: address,
        repay_amount: u64,
    ) acquires LendingPool, PositionRegistry, PriceOracle, LendingRegistry {
        assert!(repay_amount > 0, EINVALID_AMOUNT);

        let liquidator_addr = signer::address_of(liquidator);
        let asset_type = type_info::type_of<AptosCoin>();

        // Verify pool exists
        assert!(exists<LendingPool>(@aptospay), EPOOL_NOT_FOUND);

        // Update interest rates before liquidation
        update_interest_rates();

        let pool = borrow_global_mut<LendingPool>(@aptospay);

        // Get borrower position
        let position_registry = borrow_global_mut<PositionRegistry>(@aptospay);
        assert!(table::contains(&position_registry.positions, borrower), EPOSITION_NOT_FOUND);

        let position = table::borrow_mut(&mut position_registry.positions, borrower);

        // Calculate current debt with accrued interest
        let current_debt = (((position.borrowed_amount as u128) * pool.borrow_index) / position.borrow_index_checkpoint) as u64;

        // Calculate health factor
        let health_factor = calculate_health_factor_internal(position);

        // Verify position is unhealthy (health_factor < 1.0)
        assert!(health_factor < MIN_HEALTH_FACTOR, EPOSITION_HEALTHY);

        // Cap repay amount at current debt
        let actual_repay = if (repay_amount > current_debt) { current_debt } else { repay_amount };

        // Verify liquidator has sufficient balance
        let liquidator_balance = coin::balance<AptosCoin>(liquidator_addr);
        assert!(liquidator_balance >= actual_repay, EINSUFFICIENT_BALANCE);

        // Calculate collateral to seize (with liquidation bonus)
        let oracle = borrow_global<PriceOracle>(@aptospay);
        let collateral_value_to_seize = ((actual_repay as u128) * ((BASIS_POINTS + DEFAULT_LIQUIDATION_BONUS) as u128)) / (BASIS_POINTS as u128);
        let collateral_to_seize = (((collateral_value_to_seize * (PRECISION_8 as u128)) / (oracle.apt_price as u128)) as u64);

        // Cap collateral at borrower's total collateral
        let actual_collateral_seized = if (collateral_to_seize > position.collateral_amount) {
            position.collateral_amount
        } else {
            collateral_to_seize
        };

        // Withdraw repayment from liquidator
        let repay_coins = coin::withdraw<AptosCoin>(liquidator, actual_repay);

        // Merge into pool
        coin::merge(&mut pool.pool_coins, repay_coins);

        // Update pool borrowed amount
        pool.total_borrowed = pool.total_borrowed - actual_repay;

        // Recalculate rates based on new utilization
        recalculate_rates_internal(pool);

        // Extract seized collateral from pool
        let seized_collateral_coins = coin::extract(&mut pool.pool_coins, actual_collateral_seized);

        // Transfer seized collateral to liquidator
        coin::deposit(liquidator_addr, seized_collateral_coins);

        // Update borrower position
        position.borrowed_amount = current_debt - actual_repay;
        position.borrow_index_checkpoint = pool.borrow_index;
        position.collateral_amount = position.collateral_amount - actual_collateral_seized;
        position.last_interaction = timestamp::now_seconds();

        // Recalculate health factor
        let new_health_factor = calculate_health_factor_internal(position);
        position.health_factor = new_health_factor;

        // Update registry statistics
        let lending_registry = borrow_global_mut<LendingRegistry>(@aptospay);
        lending_registry.total_liquidations = lending_registry.total_liquidations + 1;

        // Calculate liquidation bonus
        let liquidation_bonus = actual_collateral_seized - actual_repay;

        // Emit event
        event::emit(LiquidationEvent {
            liquidator: liquidator_addr,
            borrower,
            asset_type,
            repay_amount: actual_repay,
            collateral_seized: actual_collateral_seized,
            liquidation_bonus,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Update price oracle (admin only)
    ///
    /// # Arguments
    /// * `admin` - Signer with admin privileges
    /// * `apt_price` - New APT price (8 decimals)
    /// * `usdc_price` - New USDC price (8 decimals)
    ///
    /// # Aborts
    /// * `ENOT_AUTHORIZED` - If caller is not admin
    /// * `EINVALID_PRICE` - If prices are zero
    public entry fun update_price_oracle(
        admin: &signer,
        apt_price: u64,
        usdc_price: u64,
    ) acquires PriceOracle {
        assert!(signer::address_of(admin) == @aptospay, ENOT_AUTHORIZED);
        assert!(apt_price > 0, EINVALID_PRICE);
        assert!(usdc_price > 0, EINVALID_PRICE);

        let oracle = borrow_global_mut<PriceOracle>(@aptospay);
        oracle.apt_price = apt_price;
        oracle.usdc_price = usdc_price;
        oracle.last_update = timestamp::now_seconds();

        // Emit event
        event::emit(PriceUpdateEvent {
            apt_price,
            usdc_price,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ======================== Internal Functions ========================

    /// Update interest rates and indices
    fun update_interest_rates() acquires LendingPool {
        let pool = borrow_global_mut<LendingPool>(@aptospay);
        let now = timestamp::now_seconds();
        let time_elapsed = now - pool.last_update_timestamp;

        if (time_elapsed == 0) {
            return
        };

        // Calculate utilization rate
        let utilization = if (pool.total_liquidity == 0) {
            0
        } else {
            ((pool.total_borrowed as u128) * (BASIS_POINTS as u128) / (pool.total_liquidity as u128)) as u64
        };

        // Calculate borrow rate based on utilization
        let borrow_rate = if (utilization <= pool.optimal_utilization) {
            // Below optimal: linear from base_rate to (base_rate + slope1)
            let slope_rate = (((utilization as u128) * (pool.rate_slope1 as u128) / (pool.optimal_utilization as u128)) as u64);
            pool.base_rate + slope_rate
        } else {
            // Above optimal: linear from (base_rate + slope1) to (base_rate + slope1 + slope2)
            let excess_util = utilization - pool.optimal_utilization;
            let excess_util_range = BASIS_POINTS - pool.optimal_utilization;
            let excess_slope_rate = (((excess_util as u128) * (pool.rate_slope2 as u128) / (excess_util_range as u128)) as u64);
            pool.base_rate + pool.rate_slope1 + excess_slope_rate
        };

        // Calculate supply rate (accounting for reserve factor)
        let supply_rate = (((borrow_rate as u128) * (utilization as u128) * ((BASIS_POINTS - pool.reserve_factor) as u128) / (BASIS_POINTS as u128) / (BASIS_POINTS as u128)) as u64);

        // Update indices (compound interest)
        let borrow_interest = (borrow_rate as u128) * (time_elapsed as u128) / (SECONDS_PER_YEAR as u128);
        let supply_interest = (supply_rate as u128) * (time_elapsed as u128) / (SECONDS_PER_YEAR as u128);

        pool.borrow_index = pool.borrow_index + (pool.borrow_index * borrow_interest / (BASIS_POINTS as u128));
        pool.supply_index = pool.supply_index + (pool.supply_index * supply_interest / (BASIS_POINTS as u128));

        // Update current rates
        pool.current_borrow_rate = borrow_rate;
        pool.current_supply_rate = supply_rate;
        pool.last_update_timestamp = now;

        // Emit event
        event::emit(RateUpdateEvent {
            asset_type: pool.asset_type,
            utilization,
            borrow_rate,
            supply_rate,
            borrow_index: pool.borrow_index,
            supply_index: pool.supply_index,
            timestamp: now,
        });
    }

    /// Recalculate interest rates based on current pool utilization
    /// Does NOT accrue interest or update indices - only updates current rates
    fun recalculate_rates_internal(pool: &mut LendingPool) {
        // Calculate utilization rate
        let utilization = if (pool.total_liquidity == 0) {
            0
        } else {
            ((pool.total_borrowed as u128) * (BASIS_POINTS as u128) / (pool.total_liquidity as u128)) as u64
        };

        // Calculate borrow rate based on utilization
        let borrow_rate = if (utilization <= pool.optimal_utilization) {
            // Below optimal: linear from base_rate to (base_rate + slope1)
            let slope_rate = (((utilization as u128) * (pool.rate_slope1 as u128) / (pool.optimal_utilization as u128)) as u64);
            pool.base_rate + slope_rate
        } else {
            // Above optimal: linear from (base_rate + slope1) to (base_rate + slope1 + slope2)
            let excess_util = utilization - pool.optimal_utilization;
            let excess_util_range = BASIS_POINTS - pool.optimal_utilization;
            let excess_slope_rate = (((excess_util as u128) * (pool.rate_slope2 as u128) / (excess_util_range as u128)) as u64);
            pool.base_rate + pool.rate_slope1 + excess_slope_rate
        };

        // Calculate supply rate (accounting for reserve factor)
        let supply_rate = (((borrow_rate as u128) * (utilization as u128) * ((BASIS_POINTS - pool.reserve_factor) as u128) / (BASIS_POINTS as u128) / (BASIS_POINTS as u128)) as u64);

        // Update current rates only
        pool.current_borrow_rate = borrow_rate;
        pool.current_supply_rate = supply_rate;
    }

    /// Calculate health factor for a position
    /// health_factor = (collateral_value * liquidation_threshold) / total_debt
    /// Returns 18 decimal precision (1e18 = 1.0)
    fun calculate_health_factor_internal(position: &UserPosition): u128 acquires PriceOracle {
        // If no debt, health factor is infinite (return max u128)
        if (position.borrowed_amount == 0) {
            return 340282366920938463463374607431768211455u128 // max u128
        };

        let oracle = borrow_global<PriceOracle>(@aptospay);

        // Calculate collateral value in USD (8 decimals)
        // collateral_value = collateral_amount * apt_price / PRECISION_8
        let collateral_value = ((position.collateral_amount as u128) * (oracle.apt_price as u128) / (PRECISION_8 as u128));

        // Apply liquidation threshold
        let collateral_value_adjusted = collateral_value * (position.liquidation_threshold as u128) / (BASIS_POINTS as u128);

        // Calculate debt value in USD (8 decimals)
        // For APT-denominated debt, convert to USD using APT price
        // debt_value = borrowed_amount * apt_price / PRECISION_8
        let debt_value = ((position.borrowed_amount as u128) * (oracle.apt_price as u128) / (PRECISION_8 as u128));

        // Calculate health factor with 18 decimal precision
        // health_factor = (collateral_value_adjusted / debt_value) * PRECISION_18
        let health_factor = (collateral_value_adjusted * PRECISION_18) / debt_value;

        health_factor
    }

    // ======================== View Functions ========================

    /// Check if a pool exists
    #[view]
    public fun pool_exists(): bool {
        exists<LendingPool>(@aptospay)
    }

    /// Get pool details
    /// Returns: (total_liquidity, total_borrowed, current_borrow_rate, current_supply_rate, borrow_index, supply_index)
    #[view]
    public fun get_pool_details(): (u64, u64, u64, u64, u128, u128) acquires LendingPool {
        assert!(exists<LendingPool>(@aptospay), EPOOL_NOT_FOUND);
        let pool = borrow_global<LendingPool>(@aptospay);
        (
            pool.total_liquidity,
            pool.total_borrowed,
            pool.current_borrow_rate,
            pool.current_supply_rate,
            pool.borrow_index,
            pool.supply_index
        )
    }

    /// Get user position details
    /// Returns: (supplied_amount, borrowed_amount, collateral_amount, health_factor)
    #[view]
    public fun get_position_details(user: address): (u64, u64, u64, u128) acquires PositionRegistry {
        let position_registry = borrow_global<PositionRegistry>(@aptospay);
        assert!(table::contains(&position_registry.positions, user), EPOSITION_NOT_FOUND);

        let position = table::borrow(&position_registry.positions, user);
        (
            position.supplied_amount,
            position.borrowed_amount,
            position.collateral_amount,
            position.health_factor
        )
    }

    /// Check if user has a position
    #[view]
    public fun position_exists(user: address): bool acquires PositionRegistry {
        let position_registry = borrow_global<PositionRegistry>(@aptospay);
        table::contains(&position_registry.positions, user)
    }

    /// Get current prices from oracle
    /// Returns: (apt_price, usdc_price, last_update)
    #[view]
    public fun get_prices(): (u64, u64, u64) acquires PriceOracle {
        let oracle = borrow_global<PriceOracle>(@aptospay);
        (oracle.apt_price, oracle.usdc_price, oracle.last_update)
    }

    /// Get registry statistics
    /// Returns: (total_pools, total_volume_supplied, total_volume_borrowed, total_liquidations)
    #[view]
    public fun get_registry_stats(): (u64, u128, u128, u64) acquires LendingRegistry {
        let registry = borrow_global<LendingRegistry>(@aptospay);
        (
            registry.total_pools,
            registry.total_volume_supplied,
            registry.total_volume_borrowed,
            registry.total_liquidations
        )
    }

    /// Calculate health factor for a user
    #[view]
    public fun calculate_health_factor(user: address): u128 acquires PositionRegistry, PriceOracle {
        let position_registry = borrow_global<PositionRegistry>(@aptospay);
        assert!(table::contains(&position_registry.positions, user), EPOSITION_NOT_FOUND);

        let position = table::borrow(&position_registry.positions, user);
        calculate_health_factor_internal(position)
    }

    // ======================== Test-Only Functions ========================

    #[test_only]
    /// Initialize module for testing
    public fun init_for_test(admin: &signer) {
        init_module(admin);
    }
}
