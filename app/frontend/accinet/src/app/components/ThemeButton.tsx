'use client'
import React from 'react'
import { useState } from 'react'
import useTheme from '../hooks/useTheme'
import { MoonStar, Sun} from 'lucide-react'

const ThemeButton = () => {
    const {isDark, toggle} = useTheme();
    const theme= "w-10 h-10 p-2 rounded-md"
    return (
    <div>
        <button onClick={toggle}>
            {isDark==true?
            <Sun className={`${theme} bg-white text-yellow-500`}/>:<MoonStar className={`${theme} bg-black text-white`}/>}
        </button>
      </div>
  )
}

export default ThemeButton
