import 'dotenv/config'
import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET
if(!secret) throw new Error('JWT_SECRET is not defined in .env')

    const expiration = process.env.JWT_EXPIRATION || '8h'

export function signToken({userId,role,parishId,mustChangePassword}){
    return jwt.sign({
        role,
        parishId: parishId ?? null,
        mustChangePassword: mustChangePassword === true,
    },
    secret,
    {subject: userId, expiresIn: expiration}
    )
}

export function verifyToken(token){
    const payload = jwt.verify(token, secret)
    return {
        userId: payload.sub,
        role: payload.role,
        parishId: payload.parishId ?? null,
        mustChangePassword: payload.mustChangePassword === true,
    }
}