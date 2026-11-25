import{readdirSync as R,readFileSync as S,writeFileSync as W,mkdirSync as K}from'node:fs';
const P='00011223........222222212221222.222.............00000...........12..............1101',U='01102233........111111111111111.111.............00000...........10..............0010';
function run(p,u){
const n=p.length,D=new Int32Array(256),M=new Int32Array(256),C=new Int32Array(64),O=[];
let s=0,c=0,i=0,q=0,t=0,x,y,v,L,o,a,b,m,k;
try{
for(;;){
if(t==1e6)throw 10;
if(q<0||q>=n)throw 9;
o=p[q];
if(!P[o]||P[o]=='.')throw 5;
a=+P[o];b=+U[o];
m=o==1?1:o==2?4:o>47&&o<52?2:0;
if(q+m>=n)throw 9;
if(s<a)throw 2;
if(s-a+b>256)throw 3;
t++;q+=1+m;
switch(o){
case 0:return{out:O,exit:0};
case 1:D[s++]=(p[q-1]<<24)>>24;break;
case 2:D[s++]=p[q-4]|p[q-3]<<8|p[q-2]<<16|p[q-1]<<24;break;
case 3:s--;break;
case 4:D[s]=D[s-1];s++;break;
case 5:x=D[s-1];D[s-1]=D[s-2];D[s-2]=x;break;
case 6:D[s]=D[s-2];s++;break;
case 7:x=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=x;break;
case 16:D[s-2]=D[s-2]+D[s-1]|0;s--;break;
case 17:D[s-2]=D[s-2]-D[s-1]|0;s--;break;
case 18:D[s-2]=Math.imul(D[s-2],D[s-1]);s--;break;
case 19:y=D[--s];x=D[s-1];if(!y)throw 4;D[s-1]=x==-2147483648&&y==-1?x:x/y|0;break;
case 20:y=D[--s];x=D[s-1];if(!y)throw 4;D[s-1]=x%y|0;break;
case 21:y=D[--s];x=D[s-1];if(!y)throw 4;D[s-1]=(x>>>0)/(y>>>0)|0;break;
case 22:y=D[--s];x=D[s-1];if(!y)throw 4;D[s-1]=(x>>>0)%(y>>>0)|0;break;
case 23:D[s-1]=-D[s-1]|0;break;
case 24:D[s-2]&=D[s-1];s--;break;
case 25:D[s-2]|=D[s-1];s--;break;
case 26:D[s-2]^=D[s-1];s--;break;
case 27:D[s-1]=~D[s-1];break;
case 28:D[s-2]<<=D[s-1]&31;s--;break;
case 29:D[s-2]>>=D[s-1]&31;s--;break;
case 30:D[s-2]>>>=D[s-1]&31;s--;break;
case 32:D[s-2]=D[s-2]==D[s-1]?1:0;s--;break;
case 33:D[s-2]=D[s-2]<D[s-1]?1:0;s--;break;
case 34:D[s-2]=(D[s-2]>>>0)<(D[s-1]>>>0)?1:0;s--;break;
case 48:q+=((p[q-2]|p[q-1]<<8)<<16)>>16;break;
case 49:if(D[--s]===0)q+=((p[q-2]|p[q-1]<<8)<<16)>>16;break;
case 50:if(D[--s]!==0)q+=((p[q-2]|p[q-1]<<8)<<16)>>16;break;
case 51:if(c==64)throw 7;C[c++]=q;q=p[q-2]|p[q-1]<<8;break;
case 52:if(!c)throw 8;q=C[--c];break;
case 64:y=D[s-1];if(y<0||y>255)throw 6;D[s-1]=M[y];break;
case 65:y=D[s-1];x=D[s-2];if(y<0||y>255)throw 6;s-=2;M[y]=x;break;
case 80:v=''+D[s-1];L=v.length;if(O.length+L>65536)throw 11;s--;for(k=0;k<L;k++)O.push(v.charCodeAt(k));break;
case 81:if(O.length>65535)throw 11;O.push(D[--s]&255);break;
case 82:D[s++]=i<u.length?u[i++]:-1;break;
case 83:return{out:O,exit:D[--s]&255};
}
}
}catch(e){return{out:O,exit:e}}
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',Q=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of R(I).sort()){
const r=run(new Uint8Array(S(I+'/'+id+'/program.bin')),new Uint8Array(S(I+'/'+id+'/input.bin')));
K(Q+'/'+id,{recursive:true});
W(Q+'/'+id+'/stdout.bin',Uint8Array.from(r.out));
W(Q+'/'+id+'/exit.txt',r.exit+'\n');
}
