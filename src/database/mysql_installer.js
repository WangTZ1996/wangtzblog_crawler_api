const rds = require("ali-rds");

class MysqlInstaller {

    constructor(configs, target, muti = false, debug = false) {
        this.configs = configs;
        this.target = target != null ? target : this;
        this.muti = muti;
        this.schemas = {};
        this.clients = {};
        this.debug = debug;
        if (!this.target.MYSQLCACHE) {
            this.target.MYSQLCACHE = {};
        }
        this.install();
    }

    createClient(options, name) {
        const _this = this;
        if (!name) {
            name = null;
        } else {
            name = name.toUpperCase();
        }
        const mysql = require('mysql');
        const poolextend = function (target, source, flag) {
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    flag ? (target[key] = source[key]) : (target[key] === void 0 && (target[key] = source[key]));
                }
            }
            return target;
        }
        // 使用连接池，提升性能
        const pool = mysql.createPool(poolextend({}, options));
        const rds = require('ali-rds');
        const rds2 = (transactions = false) => {
            if (_this.target.MYSQLCACHE.RDS) {
                return _this.target.MYSQLCACHE.RDS;
            }
            _this.target.MYSQLCACHE.RDS = new rds(options);
            return _this.target.MYSQLCACHE.RDS;
        }
        const tempSql = (sql, params) => {
            if (this.debug) {
                console.log(sql, params);
            }

            return new Promise(resolve => {
                pool.getConnection((err, conn) => {
                    if (err) {
                        if (this.debug) {
                            console.log('SQL', sql, params, err);
                        }
                        if (conn) {
                            conn.release();
                        }

                        resolve(null);
                    } else {
                        const callback = (err, replay) => {
                            if (err) {
                                if (this.debug) {
                                    console.log('SQL', sql, params, err);
                                }
                                resolve(null);
                            } else {
                                resolve(replay);
                            }

                        };
                        if (params) {
                            conn.query(sql, params, callback);
                        } else {
                            conn.query(sql, [], callback);
                        }
                        conn.release();
                    }
                });
            });
        }
        const tempSql_ONE = (sql, params) => {
            return new Promise(async (resolve) => {
                pool.getConnection((err, conn) => {
                    if (err) {
                        if (this.debug) {
                            console.log('SQL_ONE', sql, params, err);
                        }
                        if (conn) {
                            conn.release();
                        }

                        resolve(null);
                    } else {
                        const callback = (err, replay) => {
                            if (conn) {
                                conn.release();
                            }
                            if (err) {
                                if (this.debug) {
                                    console.log('SQL_ONE', sql, params, err);
                                }
                                resolve(null);
                            } else {
                                if (replay && replay.length > 0) {
                                    resolve(replay[0]);
                                } else {
                                    resolve(null);
                                }
                            }

                        };
                        if (params) {
                            conn.query(sql, params, callback);
                        } else {
                            conn.query(sql, [], callback);
                        }

                    }
                });
            });
        }
        const tempSql_FIRST = (table, where, params = []) => {
            return new Promise(async (resolve) => {
                let sql = this._matchSql(`select *
                                          from ${table}`, where);
                pool.getConnection((err, conn) => {
                    if (err) {
                        if (conn) {
                            conn.release();
                        }

                        resolve(null);
                    } else {
                        const callback = (err, replay) => {
                            if (conn) {
                                conn.release();
                            }
                            if (err) {
                                resolve(null);
                            } else {
                                if (replay && replay.length > 0) {
                                    resolve(replay[0]);
                                } else {
                                    resolve(null);
                                }
                            }

                        };
                        if (params) {
                            conn.query(sql, params, callback);
                        } else {
                            conn.query(sql, [], callback);
                        }
                    }
                });
            });
        }
        const tempSql_COUNT = (table, where, params = []) => {
            return new Promise(async (resolve) => {
                let sql = `select count(*) as total
                           from ${table}`;
                if (where) {
                    where = where.trim();
                    if (where !== '') {
                        if (where.indexOf('where') < 0 && where !== '') {
                            where += ' where ' + where;
                        }
                        sql += ` ${where}`;
                    }
                }
                if (!params) {
                    params = [];
                }
                pool.getConnection((err, conn) => {
                    if (err) {
                        if (conn) {
                            conn.release();
                        }

                        resolve(null);
                    } else {
                        const callback = (err, replay) => {
                            if (conn) {
                                conn.release();
                            }
                            if (err) {
                                resolve(0);
                            } else {
                                if (replay && replay.length > 0) {
                                    resolve(replay[0]['total']);
                                } else {
                                    resolve(0);
                                }
                            }

                        };
                        if (params) {
                            conn.query(sql, params, callback);
                        } else {
                            conn.query(sql, [], callback);
                        }

                    }
                });
            });
        }
        const tempSql_UPDATE = (table, data, where, params = []) => {
            return new Promise(async (resolve) => {
                let sql = `update ${table} `;
                let tempParams = [];
                if (data) {
                    let tempSets = ' set(';
                    let objectKeys = Object.keys(data);
                    let index = 0;
                    for (const key of objectKeys) {
                        if (index > 0) {
                            tempSets += ',';
                        }
                        tempSets += `${key}=?`;
                        tempParams.push(data[key]);
                    }
                    tempSets += ')';
                    sql += tempSets;
                }
                sql = this._matchSql(sql, where);
                pool.getConnection((err, conn) => {
                    if (err) {
                        if (conn) {
                            conn.release();
                        }

                        resolve(null);
                    } else {
                        const callback = (err, replay) => {
                            if (conn) {
                                conn.release();
                            }
                            if (err) {
                                resolve(null);
                            } else {
                                resolve(replay);
                            }
                        };
                        if (params) {
                            conn.query(sql, params, callback);
                        } else {
                            conn.query(sql, [], callback);
                        }

                    }
                });

            });
        }
        const tempSql_TRANS = (sqls) => {
            return new Promise(resolve => {
                pool.getConnection(async (err, conn) => {
                    if (err) {
                        resolve(null);
                    } else {
                        try {
                            await conn.beginTransaction();
                            for (let sql of sqls) {
                                conn.query(sql.sql, sql.params);
                            }
                            await conn.commit();
                            conn.release();
                            resolve(true);
                        } catch (e) {
                            await conn.rollback();
                            resolve(false);
                        }
                    }
                });
            });
        }
        if (name) {
            if (!this.target.MYSQL) {
                this.target.MYSQL = {};
            }
            let dbname = name;
            this.target.MYSQL[dbname + "RDS"] = rds2;
            this.target.MYSQL[dbname] = tempSql;
            this.target.MYSQL[dbname + "_ONE"] = tempSql_ONE
            this.target.MYSQL[dbname + "_FIRST"] = tempSql_FIRST
            this.target.MYSQL[dbname + "_COUNT"] = tempSql_COUNT
            this.target.MYSQL[dbname + "_UPDATE"] = tempSql_UPDATE
            this.target.MYSQL[dbname + "_TRANS"] = tempSql_TRANS
        } else {
            this.target.MYSQL_RDS = rds2
            this.target.MYSQL = tempSql
            this.target.MYSQL_ONE = tempSql_ONE
            this.target.MYSQL_FIRST = tempSql_FIRST
            this.target.MYSQL_COUNT = tempSql_COUNT
            this.target.MYSQL_UPDATE = tempSql_UPDATE
            this.target.MYSQL_TRANS = tempSql_TRANS
        }
        return this;
    }

    _matchWhere(where) {
        let tempWhere = '';
        if (where) {
            if (typeof where === 'string') {
                where = where.replace('where', '');
                if (where.trim() !== '') {
                    tempWhere = where;
                }
            } else {
                let index = 0;
                for (const whereKey in where) {
                    let value = where[whereKey];
                    if (index > 0) {
                        tempWhere += ` and`
                    }
                    if (typeof value === 'string') {
                        tempWhere += ` ${whereKey}='${value}' `
                    } else {
                        tempWhere += ` ${whereKey}=${value} `
                    }

                    index++;
                }
            }
        }
        return tempWhere;
    }

    _matchSql(sql, where) {
        if (!sql || sql.trim().length === 0) {
            return '';
        }
        let beforeWhere = '';
        let afterWhere = '';
        if (sql.indexOf('where') > 0) {
            let arr = sql.split('where');
            beforeWhere = arr[0];
            afterWhere = arr[1];
        } else {
            beforeWhere = sql;
        }
        let tempWhere = this._matchWhere(where);
        if (where !== '') {
            if (afterWhere !== '') {
                afterWhere = `${afterWhere} and ${tempWhere}`;
            } else {
                afterWhere = tempWhere;
            }
        }
        if (afterWhere !== '') {
            return `${beforeWhere} where ${afterWhere}`;
        }
        return beforeWhere;
    }

    //alter user 'root'@'127.0.0.1' identified by 'root123456';

    install() {
        if (this.muti) {
            const keys = Object.keys(this.configs);
            for (const key of keys) {
                const config = this.configs[key];
                this.createClient(config, key);
            }
        } else {
            this.createClient(this.configs);
        }

    }

}

module.exports = async function (config) {
    const mysql = new MysqlInstaller(config)
    global.MYSQL = mysql.target.MYSQL_RDS()
    console.log('mysql installed')
};