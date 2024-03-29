/* eslint-disable import/no-extraneous-dependencies */
import React, { useState } from 'react';
import { TwitterPicker } from 'react-color';
import { useSpring, animated } from 'react-spring';

import './ColorPicker.css';

export const colors = [
  '#99c1f1', '#8ff0a4', '#f9f06b', '#ffbe6f', '#f66151', '#dc8add', '#fafafa', '#7a7a7a',
  '#62a0ea', '#57e389', '#f8e45c', '#ffa348', '#ed333b', '#c061cb', '#dfdfdf', '#4d4d4d',
  '#3584e4', '#33d17a', '#f6d32d', '#ff7800', '#e01b24', '#9141ac', '#cacaca', '#373737',
  '#1c71d8', '#2ec27e', '#f5c211', '#e66100', '#c01c28', '#813d9c', '#b5b5b5', '#212121',
  '#1a5fb4', '#26a269', '#e5a50a', '#c64600', '#a51d2d', '#613583', '#9f9f9f', '#111111',
];

export default function ColorPicker({
  onChange,
  colorType,
  selectMessage,
  starterColor,
}) {
  const [selectedColor,
    setSelectedColor] = useState(starterColor ?? '#fafafa');
  const [openPicker, setOpenPicker] = useState(false);

  const pickerAnimation = useSpring({
    pointerEvents: openPicker ? 'all' : 'none',
    opacity: openPicker ? '1' : '0',
    transform: openPicker ? 'translateY(0%)' : 'translateY(50%)',
    immediate: (key) => key === 'pointerEvents',
    config: {
      mass: 2,
      tension: 260,
      friction: 35,
      velocity: 0.009,
    },
  });

  const onChangeHandler = (color) => {
    setSelectedColor(color.hex ?? color);
    if (onChange) {
      if (colorType) {
        onChange(color[colorType]);
      } else {
        onChange(color.hex ?? color);
      }
    }
  };

  return (
    <div
      className="color-picker"
      onFocus={() => { setOpenPicker(true); }}
      onBlur={() => { setOpenPicker(false); }}
    >
      <div className="label-button-center">
        <label htmlFor="color-picker-label">
          {selectMessage}
          :
        </label>
        <button
          id="color-picker"
          label={selectMessage}
          type="button"
          className="picker-button"
          style={{
            backgroundColor: selectedColor,
          }}
        />
      </div>
      <animated.div className="picker-container" style={pickerAnimation}>
        <TwitterPicker
          triangle="hide"
          width="calc(39px * 8)"
          color={selectedColor}
          colors={colors}
          className="form-input"
          onChange={(color) => { onChangeHandler(color); }}
        />
      </animated.div>
    </div>
  );
}
