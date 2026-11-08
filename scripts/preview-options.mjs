export function previewOptions(args=process.argv.slice(2),env=process.env){
 const index=args.indexOf('--port');
 if(index>=0&&!args[index+1])throw new Error('Informe um valor após --port.');
 const port=Number(env.PORT??(index>=0?args[index+1]:3000));
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Porta inválida: use um inteiro entre 1 e 65535.');
 return {port,host:'127.0.0.1'};
}
