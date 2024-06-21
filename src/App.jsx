import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'

function App() {

  const [authUrl, setAuthUrl] = useState('');
  const [token, setToken] = useState(null);
  const [emails, setEmails] = useState([]);

  return (
    <div className='App'>
    </div>
  )
}

export default App
