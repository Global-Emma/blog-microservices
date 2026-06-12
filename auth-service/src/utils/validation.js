const { number } = require('joi')
const { string } = require('joi')
const Joi = require('joi')

const validateSignUp = (data)=>{
  const schema = Joi.object({
    firstName: Joi.string().min(3).max(50).required(),
    lastName: Joi.string().min(3).max(50).required(),
    userName: Joi.string().min(3).max(50).required(),
    email: Joi.string().lowercase().min(5).required(),
    phoneNumber: Joi.string().min(10).required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().min(4)
  })

  return schema.validate(data)

}

const validateSignIn = (data)=>{
  const schema = Joi.object({
    email: Joi.string().lowercase().min(5).required(),
    password: Joi.string().min(8).required(),
  })

  return schema.validate(data)
}

module.exports = {
  validateSignUp,
  validateSignIn
}