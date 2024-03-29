/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/jsx-no-constructed-context-values */
import {
  React, createContext, useCallback, useEffect, useRef, useState,
} from 'react';
import { GoogleLogin, googleLogout, useGoogleLogin } from '@react-oauth/google';
import {
  Routes, Route, Link, useNavigate, Navigate,
} from 'react-router-dom';
import { useSpring, animated } from 'react-spring';
import ReactLoading from 'react-loading';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './App.css';
import { Alert, CircularProgress, Snackbar } from '@mui/material';

import BottomOptions from './Components/BottomOptions/BottomOptions';
import Modal from './Components/Modal/Modal';
import Cards from './Pages/Cards/Cards';
import Login from './Pages/Login/Login';
import Project from './Pages/Project/Project';
import NotFound from './Components/NotFound/NotFound';
import getApi from './Api/api';
import getMessages from './Internationalization/emergencyMessages';

if (process.env.REACT_APP_LOCALHOST) {
  document.getElementById('page-title').innerText = `Recap - ${process.env.REACT_APP_LOCALHOST}`;
}

if (localStorage.getItem('recap@localUserProfile') === 'undefined') {
  localStorage.removeItem('recap@localUserProfile');
}

const localDefinedLanguage = localStorage.getItem('recap@definedLanguage') || (navigator.language || navigator.userLanguage);
const localUserProfile = localStorage.getItem('recap@localUserProfile');

export const UserMessageProvider = createContext();
export const UserAccountProvider = createContext();
export const LocalStorageProvider = createContext();
export const LanguageProvider = createContext();
export const ProjectInfoProvider = createContext();

function PageTemplate({
  children,
}) {
  return (
    <>
      {children}
      <BottomOptions />
    </>
  );
}

export default function App() {
  const navigate = useNavigate();
  const exportRef = useRef();
  const api = getApi();

  const [language, setLanguage] = useState(localDefinedLanguage || 'en');
  const [messages, setMessages] = useState({});

  const [actualProjectName, setActualProjectName] = useState();
  const [actualProjectPermission, setActualProjectPermission] = useState('guest');

  const [previousSessionMessage, setPreviousSessionMessage] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('recap@previousSessionError')) || null;
    } catch (err) {
      sessionStorage.removeItem('recap@previousSessionError');
      return null;
    }
  });
  const [alertMessage, setAlertMessage] = useState();
  const [alert, setAlert] = useState();
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [notification, setNotification] = useState();
  const [notificationMessage, setNotificationMessage] = useState();

  const [userCards, setUserCards] = useState();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState();
  const [token, setToken] = useState(() => {
    if (!localUserProfile) return null;
    try {
      return localUserProfile;
    } catch (err) {
      googleLogout();
      setUser(null);
      setProfile(null);

      localStorage.removeItem('recap@localUserProfile');
      setPreviousSessionMessage(JSON.parse(sessionStorage.getItem('recap@previousSessionError')) || { message: getMessages()[localDefinedLanguage].reauthenticate_token_message, severity: 'error' });

      navigate('/login');
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setIsLoading(true);
      setUser(codeResponse);
    },
    onError: () => {
      setAlertSeverity('error');
      setAlertMessage(messages.redirect_login_fail_message);
      setAlert(true);
    },
  });

  const oneTapLogin = (credentialResponse) => {
    setIsLoading(true);
    setUser(credentialResponse);
  };

  const logoutHandler = useCallback(() => {
    googleLogout();

    localStorage.removeItem('recap@localUserProfile');

    setProfile(null);
    setToken(null);
    setUser(null);
    setUserCards(null);

    navigate('/login');
    setPreviousSessionMessage(JSON.parse(sessionStorage.getItem('recap@previousSessionError')) || null);
  }, [setProfile, setUser, setPreviousSessionMessage, navigate]);

  const prepareData = useCallback((givenProfile) => ({
    google_id: (givenProfile.id || givenProfile.sub),
    email: givenProfile.email,
    preferred_lang: givenProfile.locale,
    name: givenProfile.given_name,
    username: (`${givenProfile.email}`).split('@')[0],
    picture_path: givenProfile.picture,
  }), []);

  const handleUser = useCallback((data) => {
    const response = data.data;
    const userData = response.answer;

    if (userData && !userData.google_id) {
      getApi().post(('user/')).then(() => {
        localStorage.setItem('recap@localUserProfile', response.token);
        setProfile(userData);
      });
    } else {
      setProfile(userData);
    }

    navigate('/projects');
    localStorage.setItem('recap@localUserProfile', response.token);
  }, [navigate]);

  useEffect(() => {
    if (token && !profile) {
      setIsLoading(true);
      getApi().get('user/authenticate/').then((e) => {
        setProfile(e.data);
      })
        .catch(() => {
          setAlertSeverity('error');
          setAlertMessage(
            messages.reauthenticate_static_error
            ?? getMessages()[localDefinedLanguage].reauthenticate_token_message,
          );
          setAlert(true);
          logoutHandler();
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [token, profile]);

  useEffect(() => {
    if (previousSessionMessage) {
      if (previousSessionMessage.message && previousSessionMessage.severity) {
        setAlertSeverity(previousSessionMessage.severity);
        setAlertMessage(previousSessionMessage.message);
        setAlert(true);
      }
      if (previousSessionMessage.notification) {
        setNotificationMessage(previousSessionMessage.notification);
        setNotification(true);
      }
    }
  }, [previousSessionMessage, setAlertMessage, setAlertSeverity, setNotificationMessage]);
  useEffect(() => {
    getApi().get(`language/?lang=${language}&message=all`)
      .then((response) => setMessages(response.data))
      .catch(() => {
        setAlertSeverity('error');
        setAlertMessage(getMessages()[localDefinedLanguage].error_on_language_set
          ?? getMessages().en.error_on_language_set);
        setAlert(true);
      });

    localStorage.setItem('recap@definedLanguage', language);
  }, [language]);

  useEffect(() => {
    if (user && !profile) {
      let dbUser = null;
      if (user.access_token) { // Normal redirect Login
        axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            Accept: 'application/json',
          },
        }).then((res) => {
          dbUser = res.data;
          const preparedData = prepareData(dbUser);

          api.post('user/login/', [preparedData])
            .then((data) => {
              handleUser(data);
            });
        });
      } else if (user.credential) { // One tap Login
        const decodedUserData = jwtDecode(user.credential);
        dbUser = decodedUserData;

        const preparedData = prepareData(dbUser);

        api.post('user/login/', [preparedData])
          .then((data) => {
            handleUser(data);
          });
      }
    }
  }, [user, profile, api, handleUser, prepareData]);

  useEffect(() => {
    if (!token && !profile) {
      navigate('/login');
      return;
    }

    if (token && !profile) {
      return;
    }

    try {
      const currentDate = new Date();
      const profileDate = new Date(profile.logged_in);
      const timeDifference = currentDate - profileDate;
      const maxLoginTime = 86400000 * 1.5; // One and half a day

      if (timeDifference > maxLoginTime) {
        sessionStorage.setItem('recap@previousSessionError', JSON.stringify({ notification: (messages.reauthenticate_logout_message ?? getMessages()[localDefinedLanguage].reauthenticate_logout_message) }));
        logoutHandler();
      }
    } catch (e) {
      setAlertSeverity('error');
      setAlertMessage(messages.something_went_wrong);
      setAlert(true);
      logoutHandler();
    }
  }, [profile, token, navigate, logoutHandler, messages]);

  const maybeAnError = useSpring({
    delay: 4000,
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: {},
  });

  const loadingAnimation = useSpring({
    zIndex: `${isLoading ? 50 : -1} !important`,
    opacity: isLoading ? 1 : 0,
    config: {
      mass: 0.1,
      tension: 314,
    },
    immediate: (key) => key === (isLoading ? 'zIndex' : ''),
  });

  const ProjectRelatedProvider = {
    actualProjectName,
    setActualProjectName,
    actualProjectPermission,
    setActualProjectPermission,
    exportRef,
  };

  const languageRelatedProvider = {
    messages,
    language,
    setLanguage,
  };

  const accountMethodsProvider = {
    profile,
    login,
    logoutHandler,
    userCards,
    setUserCards,
  };

  const notificationMethodsProvider = {
    setNotification,
    setNotificationMessage,
    setAlert,
    setAlertSeverity,
    setAlertMessage,
    setIsLoading,
  };

  return (
    <ProjectInfoProvider.Provider value={ProjectRelatedProvider}>
      <LanguageProvider.Provider value={languageRelatedProvider}>
        <UserAccountProvider.Provider value={accountMethodsProvider}>
          <UserMessageProvider.Provider value={notificationMethodsProvider}>
            {(messages.loaded) ? (
              <>
                <div id="App-root-container" className="App">
                  <Routes>
                    <Route path="/">
                      <Route index element={<Navigate to="/projects" />} />
                      <Route
                        path="/projects"
                        element={(
                          <PageTemplate>
                            <Cards />
                          </PageTemplate>
                        )}
                      />
                      <Route
                        path="login"
                        element={(
                          <PageTemplate>
                            <Login />
                          </PageTemplate>
                        )}
                      />
                      <Route
                        path="project/:id"
                        element={(
                          <Project
                            BottomOptions={(
                              <BottomOptions
                                onClick={(e) => e.stopPropagation()}
                                projectName={actualProjectName}
                                actualProjectPermission={actualProjectPermission}
                              />
                            )}
                          />
                        )}
                      />
                      <Route
                        path="*"
                        element={(
                          <PageTemplate>
                            <NotFound>
                              <p>{messages.not_found_page}</p>
                              <Link to="/">{messages.go_back_home}</Link>
                            </NotFound>
                          </PageTemplate>
                        )}
                      />

                    </Route>
                  </Routes>
                </div>

                <div style={{ display: 'none' }}>
                  {(!token && !profile) && (
                    <GoogleLogin
                      onSuccess={(credentialResponse) => {
                        oneTapLogin(credentialResponse);
                      }}
                      onError={() => {
                        setAlertSeverity('error');
                        setAlertMessage(messages.one_tap_login_fail_message);
                        setAlert(true);
                      }}
                      useOneTap
                    />
                  )}
                </div>
                {isLoading
                  && (
                    <animated.div style={loadingAnimation}>
                      <Modal style={{ position: 'fixed', zIndex: '100' }}>
                        <CircularProgress
                          color="info"
                          variant="indeterminate"
                        />
                      </Modal>
                    </animated.div>
                  )}
              </>
            ) : (
              <div className="centralized-container">
                <div className="loading-container">
                  <ReactLoading type="spinningBubbles" color="#bbbbbb" height="75%" width="75%" />
                </div>
                <animated.div style={maybeAnError} className="network-static-message">
                  {
                    getMessages()[localDefinedLanguage].request_timeout_excide
                    ?? getMessages().en.request_timeout_excide
                  }
                </animated.div>
              </div>
            )}
            <Snackbar
              open={notification}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              autoHideDuration={5000}
              onClose={() => {
                setNotification(false);
              }}
              message={notificationMessage}
            />

            <Snackbar
              open={alert}
              autoHideDuration={5000}
              onClose={() => {
                setAlert(false);
              }}
            >
              <Alert
                onClose={() => {
                  setAlert(false);
                }}
                severity={alertSeverity}
                variant="filled"
                sx={{ width: '100%' }}
              >
                {alertMessage}
              </Alert>
            </Snackbar>
          </UserMessageProvider.Provider>
        </UserAccountProvider.Provider>
      </LanguageProvider.Provider>
    </ProjectInfoProvider.Provider>
  );
}
