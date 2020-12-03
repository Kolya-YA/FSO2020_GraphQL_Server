const { ApolloServer, gql, UserInputError, AuthenticationError } = require('apollo-server')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

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

const typeDefs = gql`
  type Author {
    name: String!
    born: String
    booksCount: Int
    id: ID!
  }
  type Book {
    title: String!
    published: Int
    author: Author!
    genres: [String]!
    id: ID!
  }
  type User {
    username: String!
    favoriteGenre: String
    id: ID!
  }
  type Token {
    value: String!
  }
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book]!
    allGenres: [String]!
    allAuthors: [Author!]!
    me: User
  }
  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int
      genres: [String]!
    ): Book
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
`

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),

    authorCount: () => Author.collection.countDocuments(),

    allBooks: (parent, args) => {
      if (args.author) return Book.find({})
      if (args.genre) return Book.find({})
      return Book.find({})   
    },

    allGenres: () => Book.collection.distinct('genres'),

    allAuthors: () => Author.find({}),

    me: (parent, args, context) => context.currentUser
  },

  Book: {
    author: async root => {
      const author = await Author.findById(root.author)
      return {
        name: author.name,
        born: author.born
      }
    }
  },

  Author: {
    booksCount: root => Book.collection.countDocuments({ author: root._id})
  },

  Mutation: {
    addBook: async (parent, args, context) => {
      if (!context.currentUser) {
        throw new AuthenticationError("Not authenticataed")
      }
      let newBookAuthor = await Author.findOne({ name: args.author })
      if (!newBookAuthor) {
        const newAuthor = new Author({ name: args.author })
        newBookAuthor = await newAuthor.save()
      }
      const newBook = new Book({ ...args })
      newBook.author = newBookAuthor._id
      try {
        await newBook.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }
      return newBook
    },

    editAuthor: async (parent, args, context) => {
      if (!context.currentUser) {
        throw new AuthenticationError("Not authenticataed")
      }
      const updatingAuthor = await Author.findOne({ name: args.name })
      if (!updatingAuthor) return null
      updatingAuthor.born = args.setBornTo
      try {
        return updatingAuthor.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }
    },

    createUser: async (parent, args, context) => {
      if (!context.currentUser) {
        throw new AuthenticationError("Not authenticataed")
      }
      const newUser = new User({ ...args })
      try {
        return newUser.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }
    },

    login: async (parent, args) => {
      const user = await User.findOne({ username: args.username })      
      if (!user || args.password !== 'secret') {
        throw new UserInputError('Wrong credentials')
      }

      const userForToken = {
        username: user.username,
        id: user._id
      }

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    }
  }
}

const context = async ({ req }) => {
  const auth = req ? req.headers.authorization : null
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET)
    const currentUser = await User.findById(decodedToken.id)
    return { currentUser }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
})

server.listen()
  .then(({ url }) => {
    console.log(`Server ready at ${url}`)
})