const { addDish, deleteDish, get_tol_price, get_all_order, addTask, addHistory, delete_order, get_ttid, getHistory, confirm, comment, updataGrade, listVendors, detailVendor, updateSales, getDishs } = require('../controller/customer')
const { currentTime } = require('../util/currentTime')
const { detail } = require('../controller/user')

exports.index = function (req, res) {
    const type = req.session.type
    const _id = req.session._id
    const promise = detail(type, _id)
    promise.then((sqlData) => {
        if (sqlData.rowCount > 0 && sqlData.rows[0].icon) {
            res.render('login/cus_index', {
                filename: sqlData.rows[0].icon,
                username: sqlData.rows[0].cname
            })
        } else {
            res.render('login/cus_index', {
                filename: 'uploads/default.jpg',
                username: sqlData.rows[0].cname
            })
        }
    })
};

exports.list = function(req, res) {
    const promise = listVendors()
    // 每个商家信息为(vname, icon, grade, floor_price)
    promise.then((sqlData) => {
        if (sqlData.rowCount) {
            res.render('list_vendor', {
                items: sqlData.rows
            })
        }
        else{
            res.send('no vendors')
        }
    })
}

exports.detail = function(req, res) {
    const vname = req.query.vname
    const fprice = req.query.fprice
    const promise = detailVendor(vname)
    promise.then((sqlData) => {
        if (sqlData.rowCount) {
            // 返回该商家的菜品信息 (dname, dpicture, price, sale)
            ret_data = sqlData.rows
            for (let i = 0; i < ret_data.length; i++) {
                if (ret_data[i].dpicture === null) {
                    ret_data[i].dpicture = 'uploads/default_dish.jpg'
                }
            }
            res.render('list_vendor_dish', {
                vname: vname,
                dish_items: ret_data,
                choose_items: [],
                tol_price: 0,
                fprice: fprice
            })
        }
        else{
            res.send('no dishs')
        }
    })
}

exports.add = function(req, res) {
    const dname = req.query.dname
    const cid = req.session._id
    const promise = addDish(cid, dname)
    let tol_price
    promise.then((sqlData) => {
        if (sqlData.rowCount) {
            return get_tol_price(cid)
        }
        else{
            res.send('error')
        }
    })
    .then((sqlData) => {
        if (sqlData.rowCount) {
            tol_price = sqlData.rows[0].sum
            return getDishs(cid)
        }
        else{
            res.send('error')
        }
    })
    .then((sqlData) => {
        if (sqlData.rowCount) {
            res.send([sqlData.rows, tol_price])
        }
        else{
            res.send('error')
        }
    })
}

exports.delete = function(req, res) {
    const dname = req.body.dname
    // const cid = req.session._id
    const cid = '哈哈哈'
    const promise = deleteDish(cid, dname)
    let tol_price
    promise.then((sqlData) => {
        if (sqlData.rowCount) {
            return get_tol_price(cid)
        }
        else{
            res.send('error')
        }
    })
    .then((sqlData) => {
        if (sqlData.rowCount) {
            if (sqlData.rows[0].sum != null) {
                tol_price = sqlData.rows[0].sum
            }
            else{
                tol_price = 0
            }
            return getDishs(cid)
        }
        else{
            res.send('error')
        }
    })
    .then((sqlData) => {
        res.send([sqlData.rows, tol_price])
    })
}

exports.commit = function(req, res) {
    const cid = req.session._id
    // const cid = '哈哈哈'
    let tol_price
    let orders
    const promise = get_tol_price(cid)
    // 得到总价格
    promise.then((sqlData) => {
        if(sqlData.rowCount) {
            tol_price = sqlData.rows[0].sum
            return get_all_order(cid)
        }
        else{
            res.send('price error')
        }
    })
    // 得到当前所有点的菜(ttemp 里面的内容)
    .then((sqlData) => {
        if (sqlData.rowCount) {
            orders = sqlData.rows
            return addTask(cid, tol_price, orders[0].vid, currentTime())
        }
        else{
            res.send('orders error')
        }
    })
    // 添加任务后得到 ttid
    .then((sqlData) => {
        if (sqlData.rowCount) {
            return get_ttid(cid)
        }
        else{
            res.send('ttid error')
        }
    })
    // 添加 ttid 到 orders
    .then((sqlData) => {
        if (sqlData.rowCount) {
            let ttid = sqlData.rows[0].ttid
            for (var key in orders) {
                orders[key].ttid = ttid
            }
            return addHistory(orders)
        }
        else{
            res.send('task error')
        }
    })
    // 增加历史后更新销量
    .then((sqlData) => {
        if (sqlData.rowCount) {
            return updateSales(orders)
        }
        else{
            res.send('history error')
        }
    })
    // 更新销量后删除 ttemp 中的内容
    .then((sqlData) => {
        if (sqlData.rowCount) {
            return delete_order(cid)
        }
        else{
            res.send('update sale error')
        }
    })
    .then((sqlData) => {
        if (sqlData.rowCount) {
            res.send('succes commit')
        }
        else{
            res.send('delete error')
        }
    })
}

exports.history = function(req, res) {
    const cid = req.session._id
    // const cid = '哈哈哈'
    const promise = getHistory(cid)
    promise.then((sqlData) => {
        if (sqlData.rowCount) {
            // 返回task中订单信息 (ttid, cid, rid, tol_price, status, creattime, finishtime, vid)
            // 按 status 从小到大排序, 再按发起时间排序
            res.send(sqlData.rows)
        }
        else{
            res.send('no history')
        }
    })
}

exports.Gcomment = function(req, res) {
    const ttid = req.query.ttid
    const vid = req.query.vid
    res.render('comment_dish', {
        ttid: ttid,
        vid: vid
    })
}

exports.Pcomment = function(req, res) {
    const cid = req.session._id
    // const cid = '哈哈哈'
    const ttid = req.query.ttid
    const vid = req.query.vid
    const cwords = req.body.cwords
    const grade = req.body.grade
    const promise = comment(cid, ttid, vid, cwords, currentTime(), grade)
    // 新增评价后更新商家评分
    promise.then((sqlData) => {
        if (sqlData.rowCount) {
            return updataGrade(vid)
        }
        else{
            res.send('comment fail')
        }
    })
    .then((sqlData) => {
        if (sqlData.rowCount) {
            res.send('update success')
        }
        else{
            res.send('update fail')
        }
    })
}

exports.confirm = function(req, res) {
    const ttid = req.body.ttid
    const promise = confirm(ttid, currentTime())
    // 将订单状态修改为 2，添加完成时间
    promise.then((sqlData) => {
        if (sqlData.rowCount) {
            res.send('success confirm')
        }
        else{
            res.send('confirm error')
        }
    })
}