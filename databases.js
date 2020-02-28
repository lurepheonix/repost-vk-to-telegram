const dotenv = require('dotenv').config()
const util = require('util')

class Database {
    
    constructor() { }

    async init() {
        switch(process.env.DB_DRIVER) {
            case 'mysql':
                this.database = new Mysql()
                break
            case 'sqlite':
                this.database = new Sqlite()
                break
            case 'postgres':
                this.database = new Postgresql()
                break
            default:
                console.log("Database driver is not set! Please set it up in .env, then try again.")
                process.exit(22)
        }
        await this.database.init()
    }

    async search(id) {
        let search = await this.database.search(id)
        if (search) {
            return true
        } else {
            return false
        }
    }

    async seed() {
        await this.database.seed(process.env.MYSQL_TABLE_NAME)
        console.log("Database seed method worked")
    }

    async addPost(id) {
        await this.database.addPost(id)
        console.log("Post added!")
    }

    async end() {
        await this.database.end()
        console.log("Connection down!")
    }

}

class Mysql {
    
    constructor() { }

    async init() {
        await this.createConnection()
    }

    async createConnection() {
        const mysql = require('mysql2/promise')
        this.db = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            database: process.env.MYSQL_DB,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWD,
        })
        console.log("\nConnection created!")
    }

    async seed() {
        let [results] = await this.db.execute('SHOW TABLES LIKE "' + process.env.MYSQL_TABLE_NAME + '"');
        if (results.length == 0) {
            console.log("\nCreating table named " + process.env.MYSQL_TABLE_NAME + "...")
            this.db.execute("CREATE TABLE " + process.env.MYSQL_TABLE_NAME + " (id BIGINT AUTO_INCREMENT PRIMARY KEY, post_id INT)")
            console.log("Table created!")
        } else {
            console.log("\nTable named " + process.env.MYSQL_TABLE_NAME + " already exists! \nPlease delete the existing table, if you know it wasn't used before or the schema is incorrect.\nOtherwise, use some other table.")
        }
        this.db.end()
    }

    async search(id) {
        let [results] = await this.db.execute("SELECT * FROM " + process.env.MYSQL_TABLE_NAME + " WHERE post_id='" + id + "'")
        if (results.length > 0) {
            return true
        } else {
            return false
        }
    }

    async addPost(id) {
        await this.db.execute("INSERT INTO "+ process.env.MYSQL_TABLE_NAME +" (post_id) VALUES ('" + id + "')")
    }

    async end() {
        await this.db.end()
    }
}

class Sqlite {
    
    constructor() { }

    async init() {
        const sqlite = require('sqlite')
        this.db = await sqlite.open(process.env.SQLITE_DB)
    }

    async seed() {
        let results = await this.db.get("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='" + process.env.SQLITE_TABLE_NAME + "';")
        if (results['count(*)'] === 0) {
            console.log("\nCreating table named " + process.env.SQLITE_TABLE_NAME + "...")
            await this.db.get("CREATE TABLE " + process.env.SQLITE_TABLE_NAME + " (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL)")
            console.log("Table created!")
        } else {
            console.log("\nTable named " + process.env.SQLITE_TABLE_NAME + " already exists! \nPlease delete the existing table, if you know it wasn't used before or the schema is incorrect.\nOtherwise, use some other table.")
        }
    }

    async search(id) {
        let results = await this.db.get("SELECT * FROM " + process.env.SQLITE_TABLE_NAME + " WHERE post_id='" + id + "'")
        if (results === undefined) {
            return false
        } else {
            return true
        }
    }

    async addPost(id) {
        await this.db.run("INSERT INTO " + process.env.SQLITE_TABLE_NAME + " (post_id) VALUES ('" + id + "');")
    }

    async end() {
        await this.db.close()
    }
}

class Postgresql {

    constructor() {}

    async init() {
        const { Client } = require('pg')
        this.db = new Client({
            host: process.env.PG_HOST,
            port: process.env.PG_PORT,
            database: process.env.PG_DB,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWD
        })
        this.db.connect()
    }

    async seed() {
        let results = await this.db.query("SELECT to_regclass('public." + process.env.PG_TABLE_NAME +"');")	
        
        if ((results.rows[0].to_regclass) != process.env.PG_TABLE_NAME) {
            console.log("\nCreating table named " + process.env.PG_TABLE_NAME + "...")
            await this.db.query("CREATE TABLE " + process.env.PG_TABLE_NAME + "(post_id INTEGER);")
            console.log("Table created!")
        } else {
            console.log("\nTable named " + process.env.PG_TABLE_NAME + " already exists! \nPlease delete the existing table, if you know it wasn't used before or the schema is incorrect.\nOtherwise, use some other table.")
        }
    }

    async search(id) {
        let results = await this.db.query("SELECT * FROM " + process.env.PG_TABLE_NAME + " WHERE post_id = " + id + ";")
        if (results.rows.length == 0) {
            return false
        } else {
            return true
        }
    }

    async addPost(id) {
        await this.db.query("INSERT INTO " + process.env.PG_TABLE_NAME + " VALUES (" + id +");")
    }

    async end(id) {
        await this.db.end()
    }
}

module.exports = { Database }