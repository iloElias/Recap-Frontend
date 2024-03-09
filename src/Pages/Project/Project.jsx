import React, { useCallback, useEffect, useState } from "react";
import "./Project.css";
import { useNavigate, useParams } from "react-router-dom";
import { useSpring, animated } from "react-spring";
import { jwtDecode } from 'jwt-decode';

import { Link } from 'react-router-dom'

import { Alert, Paper, Snackbar, Tooltip, tooltipClasses, Grow } from "@mui/material";
import NotFound from "../../Components/NotFound/NotFound";

import styled from "@emotion/styled";
import getApi from "../../Api/api";
import Modal from "../../Components/Modal/Modal";
import Button from "../../Components/Button/Button";
import Input from "../../Components/Input/Input";

import { Editor } from "@monaco-editor/react";
import SheetsRenderer from "../../Components/SheetsRenderer/SheetsRenderer";

const getWindowSize = () => {
    return { height: window.innerHeight, width: window.innerWidth };
}

const explodeMinSize = () => {
    if (getWindowSize().width <= 640) {
        return true;
    }
    return false;
}

const localDefinedPreferEditorOpen = localStorage.getItem('recap@preferEditorOpen') ?? true;
const localDefinedPreferMobileState = localStorage.getItem('recap@preferMobileState') ?? false;

document.getElementById("page-title").innerText = "Recap - Project";
const saveMarkdownWaitTime = 5000;

export default function Project({ messages, setLoading, exportRef, setProjectName, setCurrentProjectAccess, profile, BottomOptions }) {
    const [editorInstance, setEditorInstance] = useState();

    const [openEditor, setOpenEditor] = useState(localDefinedPreferEditorOpen === 'true' ? true : false);
    const [userForceMobile, setUserForceMobile] = useState(explodeMinSize() ? true : (localDefinedPreferMobileState === 'true' ? true : false));
    const [isMobile, setIsMobile] = useState(explodeMinSize());

    const [fullScreen, setFullScreen] = useState(false);

    const [deleteValue, setDeleteValue] = useState();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [required, setRequired] = useState(false);

    const [modalContent, setModalContent] = useState(<></>);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const [alertMessage, setAlertMessage] = useState();
    const [alert, openAlert] = useState();
    const [alertSeverity, setAlertSeverity] = useState('success');
    const [notification, setNotification] = useState();
    const [notificationMessage, setNotificationMessage] = useState();

    const [notFoundProject, setNotFoundProject] = useState();

    const [markdownText, setMarkdownText] = useState('');
    const [localMarkdownText, setLocalMarkdownText] = useState('');
    const [saveProject, setSaveProject] = useState(false);
    const [lastSavedValue, setLastSavedValue] = useState();
    const [lastSavedTime, setLastSavedTime] = useState(Date.now);

    const [goHome, setGoHome] = useState(false);
    const urlParam = useParams('/project/:id');
    const [projectData, setProjectData] = useState({ pre_id: urlParam.id })
    const [projectAccess, setProjectAccess] = useState()

    window.addEventListener('resize', () => { setIsMobile(explodeMinSize()) });

    // Code editor animations
    const editorSideAnimation = useSpring({
        transform: openEditor ? `translateX(0dvw)` : `translateX(-24.75dvw)`,
    });
    const editorBottomAnimation = useSpring({
        transform: openEditor ? 'translateY(0%)' : 'translateY(44%)',
    });
    const codeEditorAnimation = useSpring({
        width: openEditor && fullScreen ? '95dvw' : '24.75dvw',
        maxWidth: 'calc(100dvw - max(33px, 5dvh))'
    });

    const codeEditorAnimationMobile = useSpring({
        height: openEditor && fullScreen ? '87%' : '40%',
    });

    // Project visualizer animations
    const editorVisualizerAnimation = useSpring({
        marginLeft: openEditor ? 'max(calc(24.75dvw + 9dvh) ,calc(24.75dvw + (4dvh + 33px)))' : 'max(calc(0dvw + 9dvh) ,calc(0dvw + (4dvh + 33px)))',
        border: (projectAccess === 'guest') && 'none'
    });

    // Buttons animation
    const editorButtonAnimation = useSpring({
        rotate: openEditor ? '0deg' : '180deg'
    });
    const editorButtonMobileAnimation = useSpring({
        rotate: openEditor ? '-90deg' : '90deg'
    });

    // Modal animation
    const modalAnimation = useSpring({
        zIndex: showModal ? 4 : -1,
        opacity: showModal ? 1 : 0,
        config: {
            mass: 0.1,
            tension: 314
        },
        immediate: (key) => key === (showModal ? "zIndex" : "")
    });

    const saveHandle = useCallback((fileValue, projectId) => {
        if (fileValue === lastSavedValue) {
            if (goHome) {
                setShowModal(false);
                setAlertMessage(`${messages.item_updated_returning_home}`.replace(':str', messages.card));
                setAlertSeverity('success')
                openAlert(true);
                setShowModal(false);
                setLoading(true);

                setTimeout(() => {
                    setLoading(false);
                    navigate('/projects');
                }, 2000);
            }
            return;
        }

        const currentTime = Date.now();
        if (lastSavedTime && (currentTime - lastSavedTime < saveMarkdownWaitTime)) {
            const remainingWaitTime = saveMarkdownWaitTime - (currentTime - lastSavedTime);
            return remainingWaitTime;
        }

        const receivedToken = localStorage.getItem("recap@localUserProfile");

        setShowModal(false);
        setLoading(true);
        getApi().put(`/project/?project_id=${projectId}`, [{ imd: fileValue }], {
            headers: {
                Authorization: `Bearer ${receivedToken}`,
            }
        }).then((e) => {
            setLastSavedTime(Date.now());
            setLastSavedValue(fileValue);
            if (goHome) {
                setAlertMessage(`${messages.item_updated_returning_home}`.replace(':str', messages.card));
                setAlertSeverity('success')
                openAlert(true);

                setTimeout(() => {
                    navigate('/projects');
                }, 2000);
            } else {
                openAlert(true);
                setAlertSeverity('success')
                setAlertMessage(`${messages.item_updated}`.replace(':str', messages.card));
                setLoading(false);
            }
        }).catch((e) => {
            setLoading(false);
            if (e.response.status === 400) {
                setAlertMessage(`${messages.item_update_error}`.replace(':str', messages.card));
                setAlertSeverity('error')
            } else if (e.response.status === 405) {
                setAlertMessage(messages.not_allowed_to_edit);
                setAlertSeverity('error')
            } else if (e.response.status === 404) {
                setNotFoundProject(true)
            } else if (e.response.status === 500) {
                setAlertMessage(`${messages.item_update_error}`.replace(':str', messages.card));
                setAlertSeverity('error')
            }
            openAlert(true);
        })
    }, [messages, goHome, lastSavedValue, lastSavedTime, setAlertMessage, setLastSavedTime, setLastSavedValue, setAlertSeverity, openAlert, navigate, setLoading]);

    const deleteHandle = useCallback((projectId, profile) => {
        if (deleteValue === projectData.name) {
            setShowModal(false);
            setLoading(true);
            getApi().delete(`/project/?project_id=${projectId}&user_id=${profile.id}`).then(() => {
                setAlertMessage(`${messages.delete_project_success}`);
                setAlertSeverity('success')
                openAlert(true);

                navigate('/projects');
            })
        } else {
            setConfirmDelete(false);
        }
    }, [deleteValue, messages, projectData, navigate, setLoading])

    const exitProjectHandler = useCallback((fileValue) => {
        if (fileValue === lastSavedValue) {
            navigate('/projects');
        }

        setModalContent('exit');
        setShowModal(true);
    }, [navigate, setShowModal, setModalContent, lastSavedValue]);

    const deleteProjectHandler = useCallback(() => {
        setModalContent("delete");
        setShowModal(true);
    }, [setModalContent, setShowModal]);

    const editorDidMount = (editor, monaco) => {
        setEditorInstance(editor);
    }




    useEffect(() => {
        if (projectAccess === 'guest') {
            setOpenEditor(false);
        }
    }, [projectAccess, setOpenEditor]);

    useEffect(() => {
        if (saveProject) {
            if (editorInstance) {
                editorInstance.getAction('editor.action.formatDocument').run();
            }

            saveHandle(markdownText, urlParam.id);
            setSaveProject(false);
        }
    }, [saveProject, editorInstance, markdownText, urlParam, saveHandle]);

    useEffect(() => {
        if (confirmDelete) {
            deleteHandle(urlParam.id, profile);
        }
    }, [confirmDelete, urlParam, profile, deleteHandle]);

    const handleReload = useCallback((markdownText) => {
        let text = markdownText.replaceAll('\\n', '');
        text = text.replaceAll('\\n', '');
        text = text.replaceAll('\\', '');
        text = text.replaceAll('    ', '');

        try {
            setLocalMarkdownText(JSON.parse(text));
        } catch (e) {
            setLocalMarkdownText(text);
        }

        if (editorInstance) {
            editorInstance.getAction('editor.action.formatDocument').run();
        }
    }, [setLocalMarkdownText, editorInstance])

    useEffect(() => {
        if (!projectData || projectData.id) return;

        if (projectData.pre_id) {
            setNotificationMessage(messages.loading_your_project);
            setNotification(true)
            setLoading(true);

            const receivedToken = localStorage.getItem("recap@localUserProfile");

            getApi().get(`/project/markdown?project_id=${projectData.pre_id}`, {
                headers: {
                    Authorization: `Bearer ${receivedToken}`,
                }
            }).then((data) => {
                const decodedData = jwtDecode(data.data);

                if (decodedData[0].state === 'inactive') {
                    setNotFoundProject('notActive');
                } else {
                    setLastSavedValue(decodedData[0].imd);
                    setProjectData(decodedData[0]);
                    setMarkdownText(decodedData[0].imd);
                    handleReload(decodedData[0].imd);
                    setProjectAccess(decodedData[0].user_permissions);
                    setCurrentProjectAccess(decodedData[0].user_permissions);

                    // eslint-disable-next-line
                    let fileName = `${decodedData[0].name}`.toLowerCase().replace(/[^\x00-\x7F]/g, "").replaceAll(' ', '_');
                    document.getElementById("page-title").innerText = `Recap - ${decodedData[0].name}`;
                    setProjectName(fileName);

                    if (editorInstance) {
                        editorInstance.getAction('editor.action.formatDocument').run();
                    }
                }

                setLoading(false);
            }).catch((e) => {
                if (e.response?.status === 403) {
                    setNotFoundProject('notAllowed');
                    return;
                }
                if (e.response?.status === 404) {
                    setNotFoundProject('notFound');
                    return;
                }
                if (e.response?.status === 400 || e.response?.data?.status === "active") {
                    setNotFoundProject('notActive');
                    return;
                }
            }).finally(() => {
                setLoading(false);
            })
        }
    }, [projectData, editorInstance, messages, setProjectName, setCurrentProjectAccess, setLastSavedValue, setProjectData, setLocalMarkdownText, setMarkdownText, handleReload, setLoading]);

    const handleFileSave = () => {
        setSaveProject(true);
    }


    const toggleMobile = () => {
        localStorage.setItem("recap@preferMobileState", !userForceMobile);
        setUserForceMobile(!userForceMobile);
    }

    const BootstrapTooltip = styled(({ className, ...props }) => (
        <Tooltip {...props} classes={{ popper: className }} />
    ))(({ theme }) => ({
        [`& .${tooltipClasses.arrow}`]: {
            color: 'rgba(146, 146, 146, 0.719)',
        },
        [`& .${tooltipClasses.tooltip}`]: {
            backgroundColor: '#fafafa',
            color: 'rgba(0, 0, 0, 0.87)',
            border: 'solid 0.1dvh rgba(146, 146, 146, 0.719)',
            fontFamily: 'Inter',
            fontSize: '2vh',
            padding: '1vh'
        },
    }));

    const renderSwitch = () => {
        switch (notFoundProject) {
            case 'notFound':
                return (<NotFoundCase messages={messages} />);
            case 'notAllowed':
                return (<NotAllowedCase messages={messages} />);
            case 'notActive':
                return (<NotActiveCase messages={messages} />);
            default:
                break;
        }
    }

    useEffect(() => {

    }, [isMobile]);

    return (
        <>
            {!isMobile && <BottomOptions />}

            {!notFoundProject ? (
                <div id="project-editor" className={(!isMobile && !userForceMobile ? '' : 'mobile ') + "project-editor-container"}>
                    <animated.div id="project-visualizer" className="project-visualizer" style={(!isMobile && !userForceMobile) ? editorVisualizerAnimation : null} >
                        <div ref={exportRef} id="text-container" className="transpiled-text-container">
                            <SheetsRenderer render={localMarkdownText} userPermission={projectAccess} messages={messages} setRender={handleReload} setCurrentTextOnEditor={setMarkdownText} />
                        </div>
                    </animated.div>

                    {(projectAccess !== 'guest') && (<animated.div className="editor-tab" style={(!isMobile && !userForceMobile) ? editorSideAnimation : editorBottomAnimation}>
                        <animated.div id='code-editor-container' className="code-editor" style={(!isMobile && !userForceMobile) ? codeEditorAnimation : codeEditorAnimationMobile}>
                            <Editor
                                width="100%"
                                height="100%"

                                value={markdownText}
                                language="json" //"markdown"
                                theme="vs-dark"

                                onChange={(value) => {
                                    setMarkdownText(value);
                                }}

                                onMount={editorDidMount}

                                options={{
                                    inlineSuggest: true,
                                    fontSize: "12px",
                                    fontFamily: "Fira Code, monospace",
                                    lineDecorationsWidth: 0,
                                    formatOnType: true,

                                    renderIndentGuides: false,

                                    autoClosingBrackets: true,
                                    minimap: {
                                        enabled: false
                                    }
                                }}
                            />
                        </animated.div>

                        <div id="editor-buttons-container" className="editor-buttons" style={{
                            paddingTop: (!isMobile && !userForceMobile) ? "2dvh" : "0",
                        }}>
                            <BootstrapTooltip title={messages.legend_hide_code_editor} placement={(!isMobile && !userForceMobile) ? "right" : "top"} arrow leaveDelay={100} >
                                <button className="close-button rotate-button" onClick={() => {
                                    localStorage.setItem("recap@preferEditorOpen", !openEditor);
                                    setOpenEditor(!openEditor);
                                }}><animated.div style={(!isMobile && !userForceMobile) ? editorButtonAnimation : editorButtonMobileAnimation}><i className="bi bi-arrow-bar-left"></i></animated.div></button>
                            </BootstrapTooltip>

                            <BootstrapTooltip title={messages.legend_toggle_fullscreen} placement={(!isMobile && !userForceMobile) ? "right" : "top"} arrow leaveDelay={100} >
                                <button className="close-button rotate-button" onClick={() => {
                                    setFullScreen(!fullScreen);
                                }}>{fullScreen ? <i className="bi bi-fullscreen-exit"></i> : <i className="bi bi-fullscreen"></i>}</button>
                            </BootstrapTooltip>

                            <BootstrapTooltip title={messages.legend_reload_view} placement={(!isMobile && !userForceMobile) ? "right" : "top"} arrow leaveDelay={100} >
                                <button className="close-button" onClick={() => { handleReload(markdownText) }}><i className="bi bi-arrow-clockwise"></i></button>
                            </BootstrapTooltip>

                            {(projectAccess === 'own' || projectAccess === 'manage') && (<BootstrapTooltip title={messages.legend_save_current_state} placement={(!isMobile && !userForceMobile) ? "right" : "top"} arrow leaveDelay={100} >
                                <button className="close-button" onClick={handleFileSave}><i className="bi bi-floppy"></i></button>
                            </BootstrapTooltip>)}

                            {!explodeMinSize() &&
                                <BootstrapTooltip title={messages.legend_toggle_mobile_desktop} placement={(!isMobile && !userForceMobile) ? "right" : "top"} arrow leaveDelay={100} >
                                    <button className="close-button" onClick={toggleMobile}>{(!isMobile && !userForceMobile) ? (<i className="bi bi-phone"></i>) : (<i className="bi bi-window-fullscreen"></i>)}</button>
                                </BootstrapTooltip>}
                            <BootstrapTooltip title={messages.go_back_home} placement={(!isMobile && !userForceMobile) ? "right" : "top"} arrow leaveDelay={100} >
                                <button onClick={(projectAccess === 'own' ? exitProjectHandler : () => { navigate('/projects') })} className="close-button"><i className="bi bi-door-open"></i></button>
                            </BootstrapTooltip>
                            {(projectAccess === 'own') && (<BootstrapTooltip title={messages.legend_delete_this_project} placement={(!isMobile && !userForceMobile) ? "right" : "top"} arrow leaveDelay={100} >
                                <button onClick={deleteProjectHandler} style={{ color: "red" }} className="close-button"><i className="bi bi-trash3"></i></button>
                            </BootstrapTooltip>)}

                            {isMobile && <BottomOptions />}
                        </div>
                    </animated.div>)}

                    <animated.div style={modalAnimation} onClick={() => { setShowModal(false) }} >
                        <Modal >
                            <Grow
                                onClick={e => e.stopPropagation()}
                                in={showModal}
                                style={{ transformOrigin: '50% 0 0' }}
                                {...(showModal ? { timeout: 500 } : {})}
                            >

                                <Paper>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        maxWidth: '20rem',
                                        padding: '2.5dvh 4dvh',
                                        gap: '1vh'
                                    }} >
                                        {modalContent === "delete" ?
                                            (<form onSubmit={e => { e.preventDefault(); setRequired(true) }}>
                                                <h3>{messages.delete_project}</h3>
                                                <p style={{ fontSize: "14px" }}>{`${messages.delete_project_confirm}`.split(':str')[0]} <strong>{projectData.name}</strong>{`${messages.delete_project_confirm}`.split(':str')[1]}</p>
                                                <p style={{ fontSize: "13px" }}>{`${messages.delete_project_confirm_input}`.split(':str')[0]} <strong>{projectData.name}</strong>{`${messages.delete_project_confirm_input}`.split(':str')[1]}</p>

                                                <Input type="text" messages={messages} placeholder={messages.label_card_name} required={required} submitRule={(value) => { return value === projectData.name ? true : messages.delete_project_confirm_input_invalid }} update={setDeleteValue} />
                                                <Button disabled={!(deleteValue === projectData.name) ? true : false} onClick={() => {
                                                    setRequired(true);
                                                    setConfirmDelete(true);
                                                }} style={{
                                                    width: '100%'
                                                }}>{messages.confirm}</Button>
                                            </form>) : (
                                                <>
                                                    <h3>{messages.save_project}</h3>
                                                    <Button onClick={() => {
                                                        setGoHome(true);
                                                        handleFileSave();
                                                    }} style={{
                                                        width: '100%'
                                                    }}>
                                                        {messages.save_than_leave}
                                                    </Button>
                                                    <Button onClick={() => { navigate('/projects') }} style={{
                                                        width: '100%'
                                                    }}>
                                                        {messages.leave_without_saving}
                                                    </Button>
                                                </>
                                            )
                                        }
                                    </div>
                                </Paper>
                            </Grow>
                        </Modal>
                    </animated.div>
                </div >) : (
                <>
                </>
            )
            }

            {
                renderSwitch()
            }

            < Snackbar
                open={notification}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }
                }
                autoHideDuration={4000}
                onClose={() => { setNotification(false) }}
                message={notificationMessage}
            />

            <Snackbar open={alert} autoHideDuration={5000} onClose={() => { openAlert(false) }}>
                <Alert
                    onClose={() => { openAlert(false) }}
                    severity={alertSeverity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {alertMessage}
                </Alert>
            </Snackbar>
        </>
    );
}

function NotFoundCase({ messages }) {
    return (
        <NotFound>
            <p>{messages.not_found_project}</p>
            <Link to="/">{messages.go_back_home}</Link>
        </NotFound>
    );
}

function NotAllowedCase({ messages }) {
    return (
        <NotFound>
            <p>{messages.not_invited_to}</p>
            <Link to="/">{messages.go_back_home}</Link>
        </NotFound>
    );
}

function NotActiveCase({ messages }) {
    return (
        <NotFound>
            <p>{messages.inactivated_project_page}</p>
            <Link to="/">{messages.go_back_home}</Link>
        </NotFound>
    );
}


/*

*/