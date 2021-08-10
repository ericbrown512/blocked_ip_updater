const env = process.env;

const configuration = {
    db: {
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        waitForConnections: true,
        connectionLimit: env.DB_CONN_LIMIT || 50,
        queueLimit: 0
    }
};

module.exports = configuration;
