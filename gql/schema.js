const { gql } = require('apollo-server')

// const typeDefs
module.exports = gql`
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
    user: User!
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
  type Subscription {
    bookAdded: Book!
  }
`