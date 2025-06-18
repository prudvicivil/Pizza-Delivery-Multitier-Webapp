const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'pizza_delivery',
    port: process.env.DB_PORT || 3306
};

// Database connection
let db;

async function connectDB() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database');
        
        // Create tables if they don't exist
        await initializeTables();
    } catch (error) {
        console.error('Database connection failed:', error);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
}

async function initializeTables() {
    try {
        // Create orders table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                customer_address TEXT NOT NULL,
                total DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'preparing', 'delivered') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create order_items table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_price DECIMAL(10, 2) NOT NULL,
                quantity INT NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);

        console.log('Database tables initialized');
    } catch (error) {
        console.error('Error initializing tables:', error);
    }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Pizza delivery API is running' });
});

// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        const [orders] = await db.execute(`
            SELECT o.*, 
                   GROUP_CONCAT(
                       CONCAT(oi.item_name, ':', oi.quantity, ':', oi.item_price) 
                       SEPARATOR '|'
                   ) as items_data
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);

        // Format the orders with items
        const formattedOrders = orders.map(order => {
            const items = [];
            if (order.items_data) {
                const itemsArray = order.items_data.split('|');
                itemsArray.forEach(itemData => {
                    const [name, quantity, price] = itemData.split(':');
                    items.push({
                        name: name,
                        quantity: parseInt(quantity),
                        price: parseFloat(price)
                    });
                });
            }

            return {
                id: order.id,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                customerAddress: order.customer_address,
                total: parseFloat(order.total),
                status: order.status,
                items: items,
                createdAt: order.created_at,
                updatedAt: order.updated_at
            };
        });

        res.json(formattedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order
app.get('/api/orders/:id', async (req, res) => {
    try {
        const [orders] = await db.execute(`
            SELECT o.*, 
                   GROUP_CONCAT(
                       CONCAT(oi.item_name, ':', oi.quantity, ':', oi.item_price) 
                       SEPARATOR '|'
                   ) as items_data
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
        `, [req.params.id]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];
        const items = [];
        if (order.items_data) {
            const itemsArray = order.items_data.split('|');
            itemsArray.forEach(itemData => {
                const [name, quantity, price] = itemData.split(':');
                items.push({
                    name: name,
                    quantity: parseInt(quantity),
                    price: parseFloat(price)
                });
            });
        }

        const formattedOrder = {
            id: order.id,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            customerAddress: order.customer_address,
            total: parseFloat(order.total),
            status: order.status,
            items: items,
            createdAt: order.created_at,
            updatedAt: order.updated_at
        };

        res.json(formattedOrder);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Create new order
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, customerPhone, customerAddress, items, total } = req.body;

        if (!customerName || !customerPhone || !customerAddress || !items || !total) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items must be a non-empty array' });
        }

        // Start transaction
        await db.beginTransaction();

        try {
            // Insert order
            const [orderResult] = await db.execute(
                'INSERT INTO orders (customer_name, customer_phone, customer_address, total) VALUES (?, ?, ?, ?)',
                [customerName, customerPhone, customerAddress, total]
            );

            const orderId = orderResult.insertId;

            // Insert order items
            for (const item of items) {
                await db.execute(
                    'INSERT INTO order_items (order_id, item_name, item_price, quantity) VALUES (?, ?, ?, ?)',
                    [orderId, item.name, item.price, item.quantity]
                );
            }

            // Commit transaction
            await db.commit();

            res.status(201).json({
                id: orderId,
                customerName,
                customerPhone,
                customerAddress,
                total,
                status: 'pending',
                items,
                message: 'Order created successfully'
            });
        } catch (error) {
            // Rollback transaction on error
            await db.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Update order status
app.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'preparing', 'delivered'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const [result] = await db.execute(
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ message: 'Order status updated successfully', status });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Get order statistics
app.get('/api/stats', async (req, res) => {
    try {
        const [totalOrders] = await db.execute('SELECT COUNT(*) as count FROM orders');
        const [totalRevenue] = await db.execute('SELECT SUM(total) as revenue FROM orders');
        const [statusStats] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM orders 
            GROUP BY status
        `);

        const stats = {
            totalOrders: totalOrders[0].count,
            totalRevenue: parseFloat(totalRevenue[0].revenue || 0),
            ordersByStatus: statusStats.reduce((acc, stat) => {
                acc[stat.status] = stat.count;
                return acc;
            }, {})
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Pizza delivery API server running on port ${PORT}`);
    connectDB();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (db) {
        await db.end();
    }
    process.exit(0);
});
