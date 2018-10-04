"use strict";

let styles = {
    '1' :'font-weight:bold',
    '22':'font-weight:normal',
    '3' :'font-style:italic',
    '23':'font-style:normal',
    '4' :'text-decoration:underline',
    '24':'text-decoration:inherit',
    '5' :'text-decoration:blink',
    '25':'text-decoration:inherit',
    '7' :'-webkit-filter:invert(100%)',
    '27':'-webkit-filter:invert(0)'
}

const ansiColors = {
  'black'       :['30','40'],
  'red'         :['31','41'],
  'green'       :['32','42'],
  'yellow'      :['33','43'],
  'blue'        :['34','44'],
  'purple'      :['35','45'],
  'cyan'        :['36','46'],
  'lightgray'   :['37','47'],
  'darkgray'    :['90','100'], 
  'lightred'    :['91','101'], 
  'lightgreen'  :['92','102'], 
  'lightyellow' :['93','103'], 
  'lightblue'   :['94','104'], 
  'lightmagenta':['95','105'], 
  'lightcyan'   :['96','106'], 
  'white'       :['97','107'],
    
  'inherit'     :['39','49'] //reset foreground & background
}

Object.keys(ansiColors).forEach(function (html) {
    let foregroundColor = ansiColors[html][0];
    let backgroundColor = ansiColors[html][1];
    styles[foregroundColor] = 'color:'+html;
    styles[backgroundColor] = 'background-color:'+html;
});    
    
function ansi2span ( str )
{
    let res = str.replace(/\x1b\[m/g, '</span>')
                 .replace(/\x1b\[0m/g, '</span>');
    
    res = res.replace(/\x1b\[22m/g, '</span>\x1b[22m')  //reset bold
             .replace(/\x1b\[23m/g, '</span>\x1b[23m')  //reset italic
             .replace(/\x1b\[24m/g, '</span>\x1b[24m')  //reest underline
             .replace(/\x1b\[25m/g, '</span>\x1b[25m')  //reset blink
             .replace(/\x1b\[27m/g, '</span>\x1b[27m')  //reset reverse
             .replace(/\x1b\[39m/g, '</span>\x1b[39m')  //reset foreground
             .replace(/\x1b\[49m/g, '</span>\x1b[49m'); //reset background
    
    res = res.replace(/\x1b\[[0-9;]+m/g,function(v){
        const w = /\[[0-9;]+/g.exec(v)[0].substr(1).split(';');
        let _styles = [];
        for(let tag in w) _styles.push( styles[w[tag]] )
        return '<span style="'+_styles.join(';')+'">';
    });
    
    return res;
}

if (typeof define == "function" && define.amd) {
    define([], function() { return ansi2span })
} else if (typeof exports == "object") {
    module.exports = ansi2span;
    exports.default = ansi2span;
} 

if(typeof window !== 'undefined'){
    window.ansi2span = ansi2span;
}