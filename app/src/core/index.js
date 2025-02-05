const { forwardRequest, __resolveLoginGC, __returnURL } = require('./request_forwarding')
const { logModel } = require('../data/models/index')
const { resolveRequest } = require('./request_resolver')(logModel)
const { resolveResponse } = require('./response_resolver')
const { register, getAllUsers, devolver401, compareHashes } = require('./management')

module.exports = {
    forwardRequest,
    __resolveLoginGC,
    __returnURL,
    resolveRequest,
    resolveResponse,
    register,
    getAllUsers,
    devolver401,
    compareHashes
}