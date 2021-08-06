var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const mysql = require('mysql2/promise');
const config = require('../config');
const pool = mysql.createPool(config.db);
function query(sql, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows, fields] = yield pool.execute(sql, params);
        return rows;
    });
}
module.exports = {
    query
};
//# sourceMappingURL=db.js.map