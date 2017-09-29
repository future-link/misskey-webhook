import dotenv from 'dotenv-safe'

dotenv.load({
  allowEmptyValues: true
})

const validator = config => {
  const errors = []
  if (!config.port) errors.push('[MW_MONGODB_URI] must set an application standby port.')
  if (!config.api.uri) errors.push('[MW_API_URI] must set the URI to connect misskey-api.')
  if (!config.api.key) errors.push('[MW_API_KEY] must set the API key to connect misskey-api.')
  if (!config.mongodb) errors.push('[MW_MONGODB_URI] must set the MongoDB URI.')
  return errors
}

const config = {
  mongodb: process.env.MW_MONGODB_URI,
  api: {
    uri: process.env.MW_API_URI,
    key: process.env.MW_API_KEY
  },
  port: process.env.MW_PORT
}

const errors = validator(config)
if (errors.length > 0) throw new Error(`'${errors.join(`', '`)}'`)

export default config
