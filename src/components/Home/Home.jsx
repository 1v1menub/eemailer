import { useState, useEffect } from 'react';
import axios from 'axios';
import { JSEncrypt } from 'jsencrypt';
import "./Home.css";
import email from "../../assets/email.svg";

function encryptMessage(publicKey, message) {
  const encrypt = new JSEncrypt();
  console.log(publicKey)
  encrypt.setPublicKey(publicKey);
  const encryptedMessage = encrypt.encrypt(message);
  if (!encryptedMessage) {
    throw new Error('Encryption failed');
  }
  return encryptedMessage;
}

function decryptMessage(encryptedMessageBase64) {
  try {
    const privateKey = atob(localStorage.getItem('privateKey'));
    console.log(privateKey)
    if (!privateKey) {
      throw new Error('Private key not found in localStorage');
    }
  
    const decrypt = new JSEncrypt();
    decrypt.setPrivateKey(privateKey);
    const decryptedMessage = decrypt.decrypt(encryptedMessageBase64);
    if (!decryptedMessage) {
      console.log('Decryption failed');
      return encryptedMessageBase64;
    } 
    return decryptedMessage;
  }
  catch {
    return encryptedMessageBase64
  }
}

function Home({ profile, emails, sendEmail }) {
  const [selectedSender, setSelectedSender] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState([]);
  const [recipient, setRecipient] = useState('');
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    const fetchEmailAddresses = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/addresses');
        setEmailAddresses(response.data);
      } catch (error) {
        console.error('Error fetching email addresses:', error);
      }
    };

    fetchEmailAddresses();
  }, [showModal]);

  useEffect(() => {
    const selectedRecipient = emailAddresses.find((address) => address.user_email === recipient);
    if (selectedRecipient) {
      setRecipientPublicKey(selectedRecipient.public_key);
    }
  }, [recipient, emailAddresses]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!recipientPublicKey) {
      console.error('Recipient public key not found');
      return;
    }
    const encryptedBody = encryptMessage(recipientPublicKey, body);
    sendEmail(recipient, title, encryptedBody);
    setRecipient('');
    setTitle('');
    setBody('');
    setShowModal(false);
  };

  const senders = emails
    ? Array.from(new Set(emails.map(email => email.payload.headers.find(header => header.name === 'From')?.value)))
      .map(sender => ({
        email: sender,
        lastEmail: emails.filter(email => email.payload.headers.find(header => header.name === 'From')?.value === sender)
          .map(email => ({
            date: new Date(parseInt(email.internalDate)),
            email: email
          }))
          .sort((a, b) => b.date - a.date)[0].date
      }))
      .sort((a, b) => b.lastEmail - a.lastEmail)
    : [];

  const filteredEmails = selectedSender
    ? emails.filter(email => email.payload.headers.find(header => header.name === 'From')?.value === selectedSender)
    : [];

  return (
    <div className='home-cont'>
      {!profile ? (
        <>
          <h1 className='home-nologin-title'>This is EEMAILER, the best app for encrypted email messaging.</h1>
          <img className='home-email-img' src={email} alt="Email Illustration"/>
        </>
      ) : (
        <div className='logged-home-cont'>
          <div className='horizontal-divide'>
            <div className="tabs">
              <div className='send-email-button' onClick={() => setShowModal(true)}>SEND EMAIL</div>
              {senders.map((sender, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedSender(sender.email)}
                  className={selectedSender === sender.email ? 'active-tab' : ''}
                >
                  {sender.email}
                </button>
              ))}
            </div>
            <div className="emails">
              {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => {
                  const emailDate = new Date(parseInt(email.internalDate));
                  return (
                    <div key={email.id} className="email-item">
                      <h3>{email.payload.headers.find(header => header.name === 'Subject')?.value || 'No Subject'}</h3>
                      <p><strong>From:</strong> {email.payload.headers.find(header => header.name === 'From')?.value}</p>
                      <p><strong>Date:</strong> {emailDate.toLocaleString()}</p>
                      <p><strong>Body:</strong> {decryptMessage(email.snippet)}</p>
                    </div>
                  );
                })
              ) : (
                <p>No emails</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            <h2>Send an Email</h2>
            <form className='send-email-form' onSubmit={handleSendEmail}>
              <div className='form-input'>
                <label>To:</label>
                <select
                  className='form-input-i'
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                >
                  <option value="" disabled>Select recipient</option>
                  {emailAddresses.map((address, index) => (
                    <option key={index} value={address.user_email}>{address.user_email}</option>
                  ))}
                </select>
              </div>
              <div className='form-input'>
                <label>Subject:</label>
                <input
                  className='form-input-i'
                  placeholder='Enter email subject'
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className='form-input'>
                <label>Body:</label>
                <textarea
                  style={{height: "100px"}}
                  className='form-input-i'
                  placeholder='Enter email body'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
              <button className='submit-email-button' type="submit">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
