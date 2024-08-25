import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { FaUserFriends, FaBell, FaSearch } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";

function Dashboard({ user }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showFriendReq, setShowFriendReq] = useState(false)
  const [showFriendList, setShowFriendList] = useState(false)

  const selectedFriendRef = useRef(selectedFriend);

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  const encryptMessage = (message, recipientPublicKey) => {
    const nonce = nacl.randomBytes(24);
    const secretKey = naclUtil.decodeBase64(localStorage.getItem('privateKey'));
    const publicKey = naclUtil.decodeBase64(recipientPublicKey);

    const messageUint8 = naclUtil.decodeUTF8(message);
    const encryptedMessage = nacl.box(messageUint8, nonce, publicKey, secretKey);

    return {
      ciphertext: naclUtil.encodeBase64(encryptedMessage),
      nonce: naclUtil.encodeBase64(nonce),
    };
  };

  const decryptMessage = (ciphertext, nonce, senderPublicKey) => {
    try {
      const secretKey = naclUtil.decodeBase64(localStorage.getItem('privateKey'));
      const publicKey = naclUtil.decodeBase64(senderPublicKey);
      const encryptedMessage = naclUtil.decodeBase64(ciphertext);
      const nonceUint8 = naclUtil.decodeBase64(nonce);

      const decryptedMessage = nacl.box.open(encryptedMessage, nonceUint8, publicKey, secretKey);

      return naclUtil.encodeUTF8(decryptedMessage);
    } catch (error) {
      console.error("Decryption error:", error);
      return "Error: Message could not be decrypted";
    }
  };

  useEffect(() => {
    const fetchFriends = async () => {
      const friendsRef = collection(db, 'users', user.uid, 'friends');
      const querySnapshot = await getDocs(friendsRef);
      const friendsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const friendUser = await getDoc(doc(db, 'users', docSnapshot.id));
        return { uid: docSnapshot.id, ...friendUser.data() };
      }));
      setFriends(friendsData);
    };

    const fetchFriendRequests = async () => {
      const friendRequestsRef = collection(db, 'friendRequests');
      const q = query(friendRequestsRef, where('receiverUid', '==', user.uid), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const requestsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const senderUser = await getDoc(doc(db, 'users', docSnapshot.data().senderUid));
        return { id: docSnapshot.id, ...docSnapshot.data(), senderUsername: senderUser.data().username };
      }));
      setFriendRequests(requestsData);
    };

    fetchFriends();
    fetchFriendRequests();
  }, [user]);

  useEffect(() => {
    if (!selectedFriend) return;

    const chatId = [user.uid, selectedFriend.uid].sort().join('_');
    setChatId(chatId);

    const chatRef = collection(db, 'chats', chatId, 'messages');
    const q = query(chatRef, orderBy('timestamp'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          text: decryptMessage(data.text, data.nonce, selectedFriend.publicKey),
        };
      });
      setMessages(messages);
    });

    return () => unsubscribe();

  }, [selectedFriend]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '>=', searchQuery), where('username', '<=', searchQuery + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    const searchResults = querySnapshot.docs
      .map((doc) => ({ uid: doc.id, ...doc.data() }))
      .filter((searchedUser) => searchedUser.uid !== user.uid);
    setSearchResults(searchResults);
  };

  const handleAddFriend = async (friend) => {
    const friendRequestRef = doc(collection(db, 'friendRequests'));
    await setDoc(friendRequestRef, {
      senderUid: user.uid,
      receiverUid: friend.uid,
      status: 'pending'
    });
  };

  const handleAcceptFriendRequest = async (friendRequest) => {
    const friendRef = doc(db, 'users', user.uid, 'friends', friendRequest.senderUid);
    await setDoc(friendRef, { username: friendRequest.senderUsername });

    const userFriendRef = doc(db, 'users', friendRequest.senderUid, 'friends', user.uid);
    await setDoc(userFriendRef, { username: user.username });

    const friendRequestRef = doc(db, 'friendRequests', friendRequest.id);
    await setDoc(friendRequestRef, { status: 'accepted' }, { merge: true });

    setFriends([...friends, { uid: friendRequest.senderUid, username: friendRequest.senderUsername }]);
    setFriendRequests(friendRequests.filter(request => request.id !== friendRequest.id));
  };

  const handleDeclineFriendRequest = async (friendRequest) => {
    const friendRequestRef = doc(db, 'friendRequests', friendRequest.id);
    await setDoc(friendRequestRef, { status: 'declined' }, { merge: true });
    setFriendRequests(friendRequests.filter(request => request.id !== friendRequest.id));
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setShowFriendList(!showFriendList)
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatId || !newMessage.trim()) return;

    const recipientPublicKey = selectedFriend.publicKey;
    const { ciphertext, nonce } = encryptMessage(newMessage, recipientPublicKey);

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const newMessageRef = doc(messagesRef);
    await setDoc(newMessageRef, {
      text: ciphertext,
      nonce: nonce,
      sender: user.uid,
      timestamp: new Date(),
    });
    setNewMessage('');
  };

  const friendReqModal = () => {
    setShowFriendReq(!showFriendReq)
  }

  const friendListModal = () => {
    setShowFriendList(!showFriendList)
  }

  return (
    <div className='dashboard'>
      <h1>Telegram Clone</h1>
      <button className='friend-modal-btn' onClick={friendReqModal}><FaBell /></button>
      <button className='friend-list-btn' onClick={friendListModal}><FaUserFriends /></button>
      
      
      <form className='search' onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for users"
        />
        <button className='search-btn' type="submit"><FaSearch /></button>
      </form>

      {searchResults.map((searchedUser) => (
        <div className='friends-list' key={searchedUser.uid}>
          <p className='friend'>
            {searchedUser.username}
          </p>
          <button onClick={() => handleAddFriend(searchedUser)}>Add Friend</button>
        </div>
      ))}

      {showFriendReq && (
        <div className='friend-modal'>
          {friendRequests.map((friendRequest) => (
            <div className='friends-list' key={friendRequest.id}>
              <p>{friendRequest.senderUsername}</p>
              <button onClick={() => handleAcceptFriendRequest(friendRequest)}>Accept</button>
              <button onClick={() => handleDeclineFriendRequest(friendRequest)}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {showFriendList && (
        <div className='friends-list-cont'>
          {friends.map((friend) => (
            <div className='friends-list' key={friend.uid}>
              <p className='friend-name' onClick={() => handleSelectFriend(friend)}>{friend.username}</p>
            </div>
          ))}
        </div>
      )}


      {selectedFriend && (
        <div className='messages'>
          <div className='room-name'><p>{selectedFriend.username}</p></div>
          <div className='message-list'>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-bubble ${message.sender === user.uid ? 'sent' : 'received'}`}
              >
                <p>{message.text}</p>
              </div>
            ))}
          </div>


          <form className='send-cont' onSubmit={handleSendMessage}>
            <input
              className='message-input'
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message"
            />
            <button className='send-btn' type="submit"><IoIosSend /></button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
