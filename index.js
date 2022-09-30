const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const Datastore = require('nedb');
const initpassport = require('./config/passport-config')
const methodoverride = require('method-override')
const wa = require('./public/whatsapp/index');
const sms = require('./public/sms/index')

const app = express();
const flash = require('express-flash');
const session = require('express-session');


const signupDatabase = new Datastore('databases/signupdatabase.db');
signupDatabase.loadDatabase();


app.set('view-engine', 'ejs')
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({
    extended: false
}));
app.use(flash())
app.use(session({
    secret: 'secret bird',
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodoverride('_method'))


app.get('/', checkAuthenticated, (req, res) => {
    signupDatabase.find({ email: req.user.email }, function (err, constanst) {
        // console.log(constanst[0].code)
        // console.log(output.length)
        if (constanst[0].code == null) {
            res.render('index.ejs', { name: req.user.firstname + ' ' + req.user.lastname, displaynumber: "whatsapp:" + req.user.number })
        } else {
            res.render('verifiedindex.ejs', { name: req.user.firstname + ' ' + req.user.lastname, displaynumber: "whatsapp:" + req.user.number })
        }
    })

})
app.post('/', async (req, res) => {
    // console.log("whatsapp:" + req.user.number)
    res.json(req.body)
    await wa.sendmessage(req.body.outputdata, "whatsapp:" + req.user.number)
})


app.get('/profile', checkAuthenticated, async (req, res) => {
    try {
        signupDatabase.find({ email: req.user.email }, function (err, constanst) {
            // console.log(constanst[0].code)
            // console.log(output.length)
            if (constanst[0].code != null) {
                res.render('verifiedprofile.ejs', { name: req.user.firstname + ' ' + req.user.lastname, email: req.user.email, number: req.user.number })
            } else {
                res.render('profile.ejs', { name: req.user.firstname + ' ' + req.user.lastname, email: req.user.email, number: req.user.number })
            }
        })
    } catch (error) {
        console.log(error)
    }

})

app.post('/profile', checkAuthenticated, async (req, res) => {
    res.json(req.body)
    signupDatabase.update({ number: req.user.number }, { $set: { code: req.body.inputbox } }, { upsert: true }, function () {
        signupDatabase.persistence.compactDatafile()
    });
})

app.post('/otp', checkAuthenticated, async (req, res) => {
    // console.log(req.body)
    await sms.sendmessage("Here is your otp " + req.body.val, req.user.number)
})


app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
    signupDatabase.find({}, function (err, output) {
        initpassport(
            passport,
            email => output.find(user => user.email === email),
            id => output.find(user => user.id === id)
        )
    })
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))


app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs', { message: req.flash('message') })
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedpassword = await bcrypt.hash(req.body.password, 10)
        signupDatabase.find({ email: req.body.email }, function (err, docs) {
            var outputdocs = docs
            // console.log(outputdocs.length)
            if (outputdocs.length === 0) {
                signupDatabase.find({ number: req.body.number }, function (err, seconddocs) {
                    var numberdocs = seconddocs
                    if (numberdocs.length === 0) {
                        signupDatabase.insert({
                            id: Date.now().toString(),
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: req.body.email,
                            number: req.body.number,
                            password: hashedpassword
                        })
                        res.redirect('/login')
                    } else {
                        req.flash('message', 'A user exists with the number')
                        res.redirect('/register')
                    }
                })
            } else {
                req.flash('message', 'A user exists with that email')
                res.redirect('/register')
            }
            // console.log(outputdocs)
        })
    } catch (error) {
        res.redirect('/register')
    }
})


app.delete('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});


function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

app.listen(3000, () => console.log('listening at 3000'))