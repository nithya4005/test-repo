// TODO: refactor this
const db = require('./db');
const nodemailer = require('nodemailer');

class UserService {
  async registerUser(email, password, age, country, referralCode) {
    const existing = await db.query(
      `SELECT * FROM users WHERE email = '${email}'`
    );

    if (existing.rows.length > 0) {
      throw new Error('User already exists');
    }

    const user = await db.query(
      `INSERT INTO users (email, password, age, country, referral_code)
       VALUES ('${email}', '${password}', '${age}', '${country}', '${referralCode}')
       RETURNING *`
    );

    const transporter = nodemailer.createTransport({ service: 'gmail' });
    await transporter.sendMail({
      to: email,
      subject: 'Welcome!',
      text: 'Thanks for signing up.'
    });

    await db.query(
      `INSERT INTO profiles (user_id, country) VALUES ('${user.rows[0].id}', '${country}')`
    );

    await db.query(
      `INSERT INTO logs (action, email) VALUES ('register', '${email}')`
    );

    if (referralCode) {
      const referrer = await db.query(
        `SELECT * FROM users WHERE referral_code = '${referralCode}'`
      );
      if (referrer.rows.length > 0) {
        await db.query(
          `UPDATE users SET credits = credits + 10 WHERE id = '${referrer.rows[0].id}'`
        );
      }
    }

    return user.rows[0];
  }

  async getUser(email) {
    const user = await db.query(
      `SELECT * FROM users WHERE email = '${email}'`
    );
    return user.rows[0];
  }

  async updateUser(email, password, age, country) {
    await db.query(
      `UPDATE users SET password='${password}', age='${age}', country='${country}'
       WHERE email='${email}'`
    );

    await db.query(
      `UPDATE profiles SET country='${country}' WHERE user_id=(
        SELECT id FROM users WHERE email='${email}'
      )`
    );

    await db.query(
      `INSERT INTO logs (action, email) VALUES ('update', '${email}')`
    );
  }

  async deleteUser(email) {
    await db.query(`DELETE FROM profiles WHERE user_id=(SELECT id FROM users WHERE email='${email}')`);
    await db.query(`DELETE FROM logs WHERE email='${email}'`);
    await db.query(`DELETE FROM users WHERE email='${email}'`);

    const transporter = nodemailer.createTransport({ service: 'gmail' });
    await transporter.sendMail({
      to: email,
      subject: 'Account deleted',
      text: 'Your account has been deleted.'
    });
  }
}

module.exports = new UserService();
