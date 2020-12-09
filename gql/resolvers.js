const { UserInputError, AuthenticationError, PubSub } = require('apollo-server')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const Book = require('../models/book')
const Author = require('../models/author')
const User = require('../models/user')

const pubsub = new PubSub()
const BOOK_ADDED = 'BOOK_ADDED'

module.exports = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),

    authorCount: () => Author.collection.countDocuments(),

    allBooks: (parent, args) => {
      if (args.author) return Book.find({}) // add author filter
      if (args.genre) return Book.find({ genres: args.genre })
      return Book.find({})   
    },

    allGenres: () => Book.collection.distinct('genres'),

    allAuthors: async () => {
      const authors = await Author.find({}).populate('booksCount')
      console.log(authors)
      return authors
    },

    me: (parent, args, context) => context.currentUser
  },

  Book: {
    author: async root => {
      const author = await Author.findById(root.author)
      return {
        name: author.name,
        born: author.born,
        id: author.id
      }
    }
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
      pubsub.publish(BOOK_ADDED, { bookAdded: newBook })
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

      return {
        value: jwt.sign(userForToken, process.env.JWT_SECRET),
        user
      }
    }
  },

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator([BOOK_ADDED])
    }
  },
}