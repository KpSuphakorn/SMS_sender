// Frontend/src/components/FloatingLabelInput/FloatingLabelInput.tsx

import React, { useState } from 'react';
import { TextInput, TextInputProps } from '@mantine/core';
import classes from './FloatingLabelInput.module.css';

// กำหนด props สำหรับ FloatingLabelInput ให้รองรับ props ของ TextInput ด้วย
interface FloatingLabelInputProps extends TextInputProps {
  // คุณสามารถเพิ่ม props เฉพาะเจาะจงของคุณได้ที่นี่
}

export function FloatingLabelInput({ label, placeholder, value, onChange, ...props }: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  // เราจะไม่ใช้ value และ setValue ภายใน component นี้โดยตรงแล้ว
  // แต่จะรับมาจาก props แทน เพื่อให้เป็น Controlled Component
  
  // Logic สำหรับ data-floating ใช้ค่า value จาก props
  // เช็ค typeof value ก่อนใช้ .trim()
  const floating =
    (typeof value === 'string' && value.trim().length !== 0) ||
    focused ||
    undefined;

  return (
    <TextInput
      label={label} // ใช้ label ที่รับมาจาก props
      placeholder={placeholder} // ใช้ placeholder ที่รับมาจาก props
      classNames={classes}
      value={value} // ใช้ value ที่รับมาจาก props
      onChange={onChange} // ใช้ onChange ที่รับมาจาก props
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      mt="xs" // Mantine prop สำหรับ margin-top
      autoComplete="off" 
      data-floating={floating}
      labelProps={{ 'data-floating': floating }}
      {...props} // ส่ง props ที่เหลือไปให้ TextInput
    />
  );
}