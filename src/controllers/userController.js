const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nama, Email, dan Password wajib diisi!' });
    }

    try {
        const checkQuery = "SELECT * FROM users WHERE email = ?";
        db.query(checkQuery, [email], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar!' });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const insertQuery = "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, 'user')";
            db.query(insertQuery, [name, email, hashedPassword, phone], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Registrasi Berhasil! Silakan Login.' });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
    
        if (results.length === 0) {
            return res.status(401).json({ message: 'Email atau Password salah!' });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email atau Password salah!' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' } 
        );

        res.json({
            message: 'Login Berhasil!',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
};