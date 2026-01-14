const db = require('../config/database');

exports.getAllProducts = (req, res) => {
    const query = "SELECT id, nama, price, promo, description, image FROM product";
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database Error' });
        }
        res.json(results);
    });
};
exports.createProduct = (req, res) => {
    const { name, price, promo, description, image } = req.body;

    if (!name || !price || !promo || !description || !image) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const query = "INSERT INTO product (nama, price, promo, description, image) VALUES (?, ?, ?, ?, ?)";
    
    db.query(query, [name, price, promo, description, image], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error adding product" });
        }
        res.status(201).json({ message: 'Product berhasil di tambahkan.' });
    });
};
exports.getProductsByCategory = (req, res) => {
    const categoryId = req.params.categoryId; 
    console.log("➡️ Request Masuk! Mencari Kategori ID:", categoryId);
    const query = "SELECT * FROM product WHERE category = ?";
    
    db.query(query, [categoryId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database Error' });
        }
        console.log(`✅ Ditemukan ${results.length} produk untuk kategori ${categoryId}`);
        res.json(results);
    });
};