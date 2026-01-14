const db = require('../config/database');

exports.addToCart = (req, res) => {
    const { user_id, product_id } = req.body;
    

    if (!user_id || !product_id) {
        return res.status(400).json({ error: 'User ID & Product ID wajib diisi' });
    }

    const checkQuery = "SELECT * FROM cart WHERE user_id = ? AND product_id = ?";
    
    db.query(checkQuery, [user_id, product_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length > 0) {
            const updateQuery = "UPDATE cart SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?";
            db.query(updateQuery, [user_id, product_id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Jumlah barang bertambah' });
            });
        } else {
            const insertQuery = "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)";
            db.query(insertQuery, [user_id, product_id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Berhasil masuk keranjang' });
            });
        }
    });
};

exports.getCart = (req, res) => {
    const userId = req.params.userId;
    
    const query = `
        SELECT cart.id as cart_id, cart.quantity, product.nama, product.price, product.image 
        FROM cart 
        JOIN product ON cart.product_id = product.id 
        WHERE cart.user_id = ?
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

exports.removeFromCart = (req, res) => {
    const cartId = req.params.cartId;
    const query = "DELETE FROM cart WHERE id = ?";
    
    db.query(query, [cartId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Item dihapus' });
    });
};