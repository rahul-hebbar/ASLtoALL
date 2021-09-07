import os

def rename(src_path,dest_path,name):
    try:
        os.rename(src_path,dest_path)
    except FileExistsError:
        os.rename(src_path,f"./repeat/{name}")
    except Exception as e:
        raise(e)

def filesystem():
    for count,filename in enumerate(os.listdir("./ASL")):
        if 'ASL' in filename:
            f = filename.split('ASL')
            if len(f) == 2:
                dest_fi = f[0].strip() + '.mp4'
                rename(f'./ASL/{filename}',f'./ASL/{dest_fi}',filename)
            else:
                rename(f'./ASL/{filename}',f'./contra/{filename}',filename)
        elif '-' in filename:
            f = filename.split('-')
            if len(f) == 2:
                dest_fi = f[0].strip() + '.mp4'
                rename(f'./ASL/{filename}',f'./ASL/{dest_fi}',filename)
            else:
                rename(f'./ASL/{filename}',f'./contra/{filename}',filename)
        else:
            rename(f'./ASL/{filename}',f'./unknown/{filename}',filename)
        print(str(count),end='\r')

if __name__ == "__main__":
    filesystem()
