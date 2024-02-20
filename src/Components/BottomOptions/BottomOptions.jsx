import { ColorPaletteIcon, ExportIcon, GlobeIcon, LogoutIcon, ShareIcon, TreeDotsIcon } from "../Icons/Icons";
import { useSpring, animated } from "react-spring";
import React, { useState } from "react";
import Button from "../Button/Button";
import "./BottomOptions.css";
import { useParams } from "react-router-dom";


function OptionsMenu({ showCategory, children }) {
    const optionsAnimation = useSpring({
        opacity: showCategory ? 1 : 0,
        transform: showCategory ? "translateY(0%)" : "translateY(125%)",
        gap: showCategory ? "1dvh" : "0dvh",
        config: showCategory ? {
            mass: 0.1,
            tension: 314
        } : {
            mass: 0.1,
            tension: 197
        }
    });

    return (
        <div className="visibility-container" style={{ overflowY: showCategory ? "visible" : "clip" }}>
            <animated.div style={optionsAnimation} className="options-menu">
                {children}
            </animated.div>
        </div>
    );
}

function OptionPanel({ showPanel, title, children }) {
    const panelAnimation = useSpring({
        opacity: showPanel ? 1 : 0,
        transform: showPanel ? "translateX(0%)" : "translateX(100%)",
        config: showPanel ? {
            mass: 0.1,
            tension: 514
        } : {
            mass: 0.1,
            tension: 314
        }
    });

    return (
        <div style={{ zIndex: showPanel ? "27" : "25" }} className="vertical-visibility-container">
            <animated.div style={panelAnimation} className="option-panel">
                {title}
                {children}
            </animated.div>
        </div>
    );
}

function Option({ optionName, optionIcon, onClick, children, selected }) {

    return (
        <div className="option">
            {children ? children : ""}
            <Button className={(selected ? 'selected-button ' : '') + "option-button"} onClick={(onClick ? onClick : null)} >
                {optionIcon}
                {optionName}
            </Button>
        </div>
    );
}

export default function BottomOptions({ messages, language, setLanguage, profile, logoutHandler }) {
    const urlParam = useParams('/project/:id');

    const [showCategory, setShowCategory] = useState(false);
    const [showLanguagePanel, setShowLanguagePanel] = useState(false);
    const [showStylePanel, setShowStylePanel] = useState(false);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [showSharePanel, setShowSharePanel] = useState(false);


    const toggleCategories = () => {
        setShowCategory(!showCategory);
        setShowLanguagePanel(false);
        setShowStylePanel(false);
        setShowExportPanel(false);
        setShowSharePanel(false);
    };

    const hideAllPanels = () => {
        setShowLanguagePanel(false);
        setShowStylePanel(false);
        setShowExportPanel(false);
        setShowSharePanel(false);
    };

    const onLanguageChange = (event) => {
        const selectedLanguage = event.target.value;
        setLanguage(selectedLanguage);
        setShowLanguagePanel(false);
    };

    const hideOptions = () => {
        setShowCategory(false);
        hideAllPanels();
    }

    return messages.languages_button_title ? (
        <>
            <div style={{ display: (showCategory ? "flex" : "none") }} className="user-select-background" onClick={hideOptions} />
            <div className="bottom-modal" onClick={(e) => e.stopPropagation()} >
                <Button id="bottom-button" onClick={toggleCategories}>
                    <TreeDotsIcon />
                </Button>
                <OptionsMenu showCategory={showCategory} setShowCategory={setShowCategory}>
                    <Option optionName={messages.languages_button_title} optionIcon={<GlobeIcon />} onClick={() => { hideAllPanels(); setShowLanguagePanel(!showLanguagePanel) }} selected={showLanguagePanel}>
                        <OptionPanel showPanel={showLanguagePanel} title={messages.languages_button_title}>
                            <select onChange={onLanguageChange} value={language}>
                                <option value="en">English</option>
                                <option value="pt-BR">Português</option>
                            </select>
                        </OptionPanel>
                    </Option>
                    {urlParam.id && (
                        <>
                            <Option optionName={messages.styles_button_title} optionIcon={<ColorPaletteIcon />} onClick={() => { hideAllPanels(); setShowStylePanel(!showStylePanel) }}>
                                <OptionPanel showPanel={showStylePanel} title={messages.styles_button_title}>

                                </OptionPanel>
                            </Option>
                            <Option optionName={messages.export_project_button_title} optionIcon={<ExportIcon />} onClick={() => { hideAllPanels(); setShowExportPanel(!showExportPanel) }}>
                                <OptionPanel showPanel={showExportPanel} >
                                    <Button className={'file-export-button'}><i className="bi bi-file-earmark-image-fill"></i>{messages.export_file_as_png}</Button>
                                    <Button className={'file-export-button'}><i className="bi bi-file-earmark-pdf-fill"></i>{messages.export_file_as_pdf}</Button>
                                </OptionPanel>
                            </Option>
                            <Option optionName={messages.share_project_button_title} optionIcon={<ShareIcon />} onClick={() => { hideAllPanels(); setShowSharePanel(!showSharePanel) }}>
                                <OptionPanel showPanel={showSharePanel} title={messages.share_project_button_title}>

                                </OptionPanel>
                            </Option>
                        </>
                    )}

                    {profile && (
                        <Option onClick={() => {
                            logoutHandler();
                            hideOptions();
                        }} optionName={messages.account_logout_button_title} optionIcon={<LogoutIcon />} />
                    )}
                </OptionsMenu>
            </div>
        </>
    ) : (<></>);
}
