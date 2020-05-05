# graphql-api

This API is built with Node.js, Passport.js, and GraphQL and needs to support the following functionality:

Creating a new user with e-mail and/or phone number and password

Logging in as an existing user with the same credentials provided when
creating a user

Posting a message linked to the user

Retrieving all the messages that a user posts


Routes:

/register

/login

/

/messages

/postmessage


Dependencies:

bcryptjs

passport

express-flash

express-session

method-override

express-graphql

graphql

passport-local
