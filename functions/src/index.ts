import * as functions from 'firebase-functions';
import admin = require('firebase-admin');

const USERS_COLLECTION = 'users';

admin.initializeApp();

// 
// Background handlers
// 

export const userDeleted = functions.auth.user().onDelete(user => {
    return admin.firestore()
        .collection(USERS_COLLECTION)
        .doc(user.uid)
        .delete();
});

// 
// HTTPS handlers
// 

export const createUser = functions.https.onCall(async (data: iUser) => {
    const existingUserSnapshot = await admin.firestore()
        .collection(USERS_COLLECTION)
        .where('username', '==', data.username)
        .limit(1)
        .get();
    if (!existingUserSnapshot.empty) {
        return {
            error: {
                code: 'invalid-username',
                messageText: 'That username has already been taken.'
            }
        }
    }
    try {
        const userRecord = await admin.auth()
            .createUser({
                email: data.email,
                emailVerified: false,
                password: data.password,
                displayName: data.fullName
            });
        await admin.firestore()
            .collection(USERS_COLLECTION)
            .doc(userRecord.uid)
            .set({
                email: data.email,
                username: data.username,
                fullName: data.fullName
            })
        return {}
    } catch (err) {
        if (err.code === 'auth/email-already-exists') {
            return {
                error: {
                    code: 'invalid-email',
                    messageText: 'That email address is already in use by another account.'
                }
            }
        } else {
            console.error(err);
            return {
                error: {
                    code: '',
                    messageText: 'An unexpected error occurred creating your account. Please try again later.'
                }
            }
        }
    }
});
