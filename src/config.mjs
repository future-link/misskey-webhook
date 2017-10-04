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
  if (config.flags.clustering && !config.redis) errors.push('[MW_REDIS_URI] must set the Redis URI with clustering mode.')
  return errors
}

const config = {
  mongodb: process.env.MW_MONGODB_URI,
  api: {
    uri:
      process.env.MW_API_URI ?
        (
          process.env.MW_API_URI.endsWith('/') ?
            process.env.MW_API_URI :
            process.env.MW_API_URI + '/'
        ) :
        null,
    key: process.env.MW_API_KEY
  },
  port: process.env.MW_PORT,
  flags: {
    proxy: process.env.MW_PROXY == 'true',
    verbose: process.argv.indexOf('--verbose') !== -1,
    clustering: process.argv.indexOf('--clustering') !== -1
  },
  redis: process.env.MW_REDIS_URI || null
}

const errors = validator(config)
if (errors.length > 0) throw new Error(`'${errors.join(`', '`)}'`)

export default config
