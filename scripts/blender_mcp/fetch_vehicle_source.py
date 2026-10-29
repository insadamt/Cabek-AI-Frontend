"""Fetch the attributed Khronos concept-car modelling input.

Uses the JPEG edition because Blender cannot decode the distribution's KTX2
textures. Pins the upstream revision and hashes every downloaded input.
Depends only on Python's standard library and network access to GitHub.
"""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import urllib.request

PROJECT=Path(__file__).resolve().parents[2]
DESTINATION=PROJECT/'assets/blender/cabek-studio-v1/source'
REPOSITORY='KhronosGroup/glTF-Sample-Assets'


def read_url(url):
    request=urllib.request.Request(url,headers={'User-Agent':'CABEK-Blender-Asset-Study'})
    with urllib.request.urlopen(request,timeout=90) as response:
        return response.read()


def fetch_vehicle_source():
    DESTINATION.mkdir(parents=True,exist_ok=True)
    existing_manifest=DESTINATION/'source-manifest.json'
    revision=(json.loads(existing_manifest.read_text())['revision'] if existing_manifest.exists()
              else json.loads(read_url(f'https://api.github.com/repos/{REPOSITORY}/commits/main'))['sha'])
    base=f'https://raw.githubusercontent.com/{REPOSITORY}/{revision}/Models/CarConcept/'
    document=read_url(base+'glTF-JPG/CarConcept.gltf')
    (DESTINATION/'CarConcept.gltf').write_bytes(document)
    gltf=json.loads(document)
    resources=sorted({item['uri'] for group in ('buffers','images') for item in gltf.get(group,[]) if 'uri' in item})

    def download_resource(uri):
        if Path(uri).name!=uri:
            raise ValueError('Expected one local resource filename')
        contents=read_url(base+'glTF-JPG/'+uri)
        (DESTINATION/uri).write_bytes(contents)
        return {'file':uri,'bytes':len(contents),'sha256':hashlib.sha256(contents).hexdigest()}

    with ThreadPoolExecutor(max_workers=4) as pool:
        files=list(pool.map(download_resource,resources))
    for filename in ('LICENSE.md','metadata.json','README.md'):
        (DESTINATION/filename).write_bytes(read_url(base+filename))
    manifest={'repository':REPOSITORY,'revision':revision,'edition':'glTF-JPG','files':files,
              'source_document_sha256':hashlib.sha256(document).hexdigest()}
    (DESTINATION/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'revision':revision,'resources':len(files),'total_bytes':sum(f['bytes'] for f in files)},indent=2))


if __name__=='__main__':
    fetch_vehicle_source()
