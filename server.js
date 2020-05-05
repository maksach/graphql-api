if(process.env.NODE_ENV != 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcryptjs')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const expressGraphQL = require('express-graphql')
const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLNonNull
} = require('graphql')

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  username => users.find(user => user.username === username),
  id => users.find(user => user.id === id)
)

// const users = []

const users = []
const messages = []
// const users = [
// 	{ id: 1, username: 'smakaram', name: 'Sachin', password: '143' },
// ]
//
// const messages = [
// 	{ id: 1, name: 'hi there', username: 'smakaram' },
// 	{ id: 2, name: 'ayooo', username: 'smakaram' },
// 	{ id: 3, name: 'how are you', username: 'smakaram' },
// ]

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

// home page
app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs')
})

// messages
app.get('/messages', checkAuthenticated, (req, res) => {
  console.log(users)
  console.log(messages)
  // console.log(req.user.username)
  console.log('{ user(username: \"' + req.user.username + '\") { messages { name } } }')
  var query = '{ user(username: \"' + req.user.username + '\") { messages { name } } }'
  var result = null
  graphql(schema, query, RootQueryType)
  .then((response) => {
    // console.log("MESSAGES" + response)
    // for(let val of response.data.user.messages) {
    //   console.log(val.name)
    // }
    result = response.data.user.messages
  });

  if(result != null) {
    res.render('messages.ejs', { messages : result })
  } else {
    res.render('messages.ejs')
  }
  // res.render('messages.ejs', { messages: req.user.messages })
  // console.log(req.user.messages)
})

app.get('/postmessage', checkAuthenticated, (req, res) => {
  res.render('postmessage.ejs')
})

app.post('/messages', checkAuthenticated, (req, res) => {
  // var message = req.body.message
  // req.user.messages.push(message)
  // console.log(req.user.messages)
  var mutation = 'mutation { addMessage(name: \"' + req.body.message + '\", username: \"' + req.user.username + '\") { name } }'
  console.log(mutation)
  var result = ""
  graphql(schema, mutation, RootMutationType)
  .then((response) => {
    console.log(response)
  });
  // res.render('messages.ejs', { messages: req.user.messages })
  // res.render('messages.ejs')
})

// register
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  // users.push({
  //   id: Date.now().toString(),
  //   name: req.body.name,
  //   username: req.body.username,
  //   password: hashedPassword,
  //   messages: []
  // })
  var mutation = 'mutation { addUser(name: \"' + req.body.name + '\", username: \"' + req.body.username + '\", password: \"' + hashedPassword + '\") { name } }'
  console.log(mutation)
  var result = ""
  graphql(schema, mutation, RootMutationType)
  .then((response) => {
    console.log(response)
  });
  res.redirect('/login')
})

// login
app.get('/login', checkNotAuthenticated, (req, res) => {
  console.log(users)
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/messages',
  failureRedirect: '/login',
  failureFlash: true
}))

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

// logout
app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

// check authentication
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

const MessageType = new GraphQLObjectType({
  name: 'Message',
  description: "Message by a user",
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt) },
    name: { type: GraphQLNonNull(GraphQLString) },
    username: { type: GraphQLNonNull(GraphQLString) },
    user: {
      type: UserType,
      resolve: (message) => {
        return users.find(user => user.username === message.username)
      }
    },
  })
})

const UserType = new GraphQLObjectType({
  name: 'User',
  description: 'User of a message',
  fields: () => ({
    username: { type: GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLNonNull(GraphQLString) },
    messages: {
      type: new GraphQLList(MessageType),
      resolve: (user) => {
        return messages.filter(message => message.username === user.username)
      }
    }
  })
})

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  description: 'Root Query',
  fields: () => ({
    message: {
      type: MessageType,
      description: 'Single message',
      args: {
        id: { type: GraphQLInt }
      },
      resolve: (parent, args) => messages.find(message => message.id == args.id)
    },
    messages: {
      type: new GraphQLList(MessageType),
      description: 'List of all messages',
      resolve: () => messages
    },
    users: {
      type: new GraphQLList(UserType),
      description: 'List of all users',
      resolve: () => users
    },
    user: {
      type: UserType,
      description: 'Single user',
      args: {
        username: { type: GraphQLString }
      },
      resolve: (parent, args) => users.find(user => user.username == args.username)
    }
  })
})

const RootMutationType = new GraphQLObjectType({
  name: 'Mutation',
  description: 'Root Mutation',
  fields: () => ({
    addMessage: {
      type: MessageType,
      description: 'Add a message',
      args: {
        name: { type: GraphQLNonNull(GraphQLString) },
        username: { type: GraphQLNonNull(GraphQLString) }
      },
      resolve: (parent, args) => {
        const message = { id: messages.length + 1, name: args.name, username: args.username }
        messages.push(message)
        return message
      }
    },
    addUser: {
      type: UserType,
      description: 'Add a user',
      args: {
        username: { type: GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLNonNull(GraphQLString) },
        password: { type: GraphQLNonNull(GraphQLString) }
      },
      resolve: (parent, args) => {
        const user = { id: users.length + 1, username: args.username, name: args.name, password: args.password }
        users.push(user)
        return user
      }
    }
  })
})

const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType
})

app.use('/graphql', expressGraphQL({
  schema: schema,
  graphiql: false
}))

app.listen(3000)
