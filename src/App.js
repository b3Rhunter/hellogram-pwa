//App.js
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Matrix from './components/Matrix'

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        setUser({ ...authUser, ...userDoc.data() });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="App">
      <Matrix/>
      {user ? <Dashboard user={user} /> : <Auth setUser={setUser} />}
    </div>
  );
}

export default App;