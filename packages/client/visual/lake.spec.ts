import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import * as THREE from 'three'
import { PLOTS, world } from '../src/lake/layout.ts'

test.setTimeout(60000)
const review = resolve(import.meta.dirname,'../test-results/lake-review')
async function ready(page: import('@playwright/test').Page) {
  await page.goto('/lake-kit.html')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.lake-canvas canvas')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await mkdir(review,{recursive:true})
}
async function plotPosition(page: import('@playwright/test').Page, id: string) {
  const rect=(await page.locator('.lake-canvas canvas').boundingBox())!
  const half=Math.max(14,15/(rect.width/rect.height))
  const camera=new THREE.OrthographicCamera(-half*rect.width/rect.height,half*rect.width/rect.height,half,-half,.1,100)
  camera.position.set(0,31,17);camera.lookAt(0,0,0);camera.updateMatrixWorld()
  const p=new THREE.Vector3(...world(PLOTS.find(p=>p.id===id)!.at));p.y=.026;p.project(camera)
  return { x:rect.x+(p.x+1)/2*rect.width,y:rect.y+(1-p.y)/2*rect.height }
}
for(const [width,height] of [[1440,900],[1280,800]] as const) test(`Lake review ${width}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)))
  await page.setViewportSize({width,height});await ready(page)
  await expect(page.locator('[data-plot]')).toHaveCount(22)
  await page.screenshot({path:resolve(review,`lake-${width}.png`)})
  const png=await page.locator('.lake-canvas canvas').screenshot()
  const colours=await page.evaluate(async(data:string)=>{
    const img=new Image();img.src=`data:image/png;base64,${data}`;await img.decode()
    const c=new OffscreenCanvas(img.width,img.height),g=c.getContext('2d')!;g.drawImage(img,0,0)
    const d=g.getImageData(0,0,img.width,img.height).data
    let water=0,forest=0
    for(let i=0;i<d.length;i+=4*31){const r=d[i]!,green=d[i+1]!,b=d[i+2]!;if(b>r*1.2&&b>green)water++;if(green>r&&green>b)forest++}
    return {water,forest}
  },png.toString('base64'))
  expect(colours.water).toBeGreaterThan(100);expect(colours.forest).toBeGreaterThan(100)
  const pos=await plotPosition(page,'5.1');await page.mouse.click(pos.x,pos.y)
  await expect(page.getByRole('heading',{name:'Clearing 5 · slot 5.1'})).toBeVisible()
  await page.getByRole('button',{name:'Sawmill · xưởng cưa',exact:true}).click()
  await expect(page.locator('.lake-state')).toContainText('Đang đặt: Sawmill')
  await page.getByRole('button',{name:'Gỡ công trình',exact:true}).click()
  await expect(page.locator('.lake-state')).toContainText('Nền trống')
  await page.getByRole('button',{name:'Nhìn từ trên',exact:true}).click()
  await page.getByLabel('Hiện số clearing / slot').check()
  await page.screenshot({path:resolve(review,`lake-top-${width}.png`)})
  expect(errors).toEqual([])
})

test('Ruin, sample changes, keyboard selection, reset and close-up evidence',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await ready(page)
  const select=page.getByRole('button',{name:'Slot 5.3, Ruin',exact:true})
  await select.focus();await page.keyboard.press('Enter')
  await expect(page.getByRole('button',{name:'Sawmill · xưởng cưa',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Xem gần slot',exact:true}).click()
  const rect=(await page.locator('.lake-canvas canvas').boundingBox())!
  const centre={ x:rect.x+rect.width/2,y:rect.y+rect.height/2 }
  const capture=async(name:string)=>page.screenshot({path:resolve(review,`lake-slot-${name}.png`),clip:{x:Math.max(0,centre.x-150),y:Math.max(0,centre.y-140),width:300,height:280}})
  await capture('ruin')
  await page.getByRole('button',{name:'Thử dọn Ruin',exact:true}).click()
  await expect(page.locator('.lake-state')).toContainText('Nền trống');await capture('cleared')
  for(const name of ['Sawmill · xưởng cưa','Workshop · xưởng chế tác','Recruiter · trại tuyển quân','Roost · tổ chim','Base · căn cứ']) {
    await page.getByRole('button',{name,exact:true}).click()
    await expect(page.locator('.lake-state')).toContainText(`Đang đặt: ${name}`)
  }
  await capture('building')
  await page.getByRole('button',{name:'Gỡ công trình',exact:true}).click()
  await expect(page.locator('.lake-state')).toContainText('Nền trống');await capture('empty')
  await page.getByRole('button',{name:'Khôi phục toàn cảnh',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Chọn một nền đất',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/^Slot .*, Ruin$/})).toHaveCount(4)
  // Real orbit and zoom, then return home. Selection must not be triggered by a drag.
  const canvas=page.locator('.lake-canvas canvas'),r=(await canvas.boundingBox())!
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+80,r.y+r.height/2+30);await page.mouse.up()
  await expect(page.getByRole('heading',{name:'Chọn một nền đất',exact:true})).toBeVisible()
  await page.mouse.wheel(0,-250)
  await page.getByRole('button',{name:'Về góc mặc định',exact:true}).click()
  await page.getByText('Ghi chú bản duyệt & hiệu năng',{exact:true}).click()
  await page.getByRole('button',{name:'Đo 30 khung hình',exact:true}).click()
  await expect(page.locator('output')).toContainText('ms/khung',{timeout:15000})
})
