// Auth.js
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, getDocs, collection } from 'firebase/firestore';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

function Auth({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState(null);

  const generateKeyPair = () => {
    const keyPair = nacl.box.keyPair();
    const publicKey = naclUtil.encodeBase64(keyPair.publicKey);
    const privateKey = naclUtil.encodeBase64(keyPair.secretKey); 
    return { publicKey, privateKey };
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isSigningUp) {
      if (!username.startsWith('@')) {
        setError('Username must start with @');
        return;
      }
    
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usernames = querySnapshot.docs.map((doc) => doc.data().username);
        if (usernames.includes(username)) {
          setError('Username is already taken');
          return;
        }
    
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, 'users', userCredential.user.uid);
        const { publicKey, privateKey } = generateKeyPair();
        await setDoc(userRef, { username, uid: userCredential.user.uid, publicKey });
        localStorage.setItem('privateKey', privateKey);
        setUser(userCredential.user);
      } catch (error) {
        setError(error.message);
      }
    } else {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      } catch (error) {
        setError(error.message);
      }
    }
  };

  return (
    <div className='auth-container'>
      <h1>Telegram Clone</h1>
      <form className='auth-form' onSubmit={handleSubmit}>
        {isSigningUp && (
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button className='signin' type="submit">
          {isSigningUp ? 'Sign up' : 'Sign in'}
        </button>
        <p className='signup' onClick={() => setIsSigningUp(!isSigningUp)}>
          {isSigningUp ? 'Already have an account? Sign in' : 'Don\'t have an account? Sign up'}
        </p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

export default Auth;