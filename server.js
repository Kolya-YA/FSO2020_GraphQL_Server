8.23: Subscriptions - serverconst { ApolloServer, UserInputError, AuthenticationError } = require('apollo-server')
const mongoose = require('mongoose')

const typeDefs = require('./gql/schema')
const resolvers = require('./gql/resolvers')
const context = require('./gql/context')

console.log(`Connecting to Mongo DB`)

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
})
  .then(() => {
    console.log('Connected to Mongo DB')
  })
  .catch((error) => {
    console.log('Error connection to MongoBD', error.message)
  })

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
})

server.listen()
  .then(({ url, subscriptionsUrl }) => {
    console.log(`Server ready at ${url}`)
    console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})