import React from 'react'
import { useState } from 'react'
import useTheme from '../hooks/useTheme'
import { MoonStar, Sun} from 'lucide-react'

const ThemeButton = () => {
    const {isDark, toggle} = useTheme();
    return (
    <div>
        <button onClick={toggle}>
            {isDark==true?
            <Sun className="w-5 h-5 bg-white text-shadow-yellow-500"/>:<MoonStar className="w-5 h-5 bg-black text-shadow-white"/>}
        </button>
      </div>
  )
}

export default ThemeButton
