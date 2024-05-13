import React, { useState, useEffect, createRef } from 'react';
import Modal from 'react-modal';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

import * as USER from '@services/userAPI';
import { Image, UserInfo } from '@type/index';

const defaultSrc =
  'https://raw.githubusercontent.com/roadmanfong/react-cropper/master/example/img/child.jpg';

interface UpdateThumbnailProps {
  userInfo: UserInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateThumbnail({ userInfo, isOpen, onClose }: UpdateThumbnailProps) {
  const [image, setImage] = useState<Image>(defaultSrc);
  const [cropData, setCropData] = useState<File | null>(null);
  const cropperRef = createRef<ReactCropperElement>();

  const onChange = (e: any) => {
    e.preventDefault();
    let files;
    if (e.dataTransfer) {
      files = e.dataTransfer.files;
    } else if (e.target) {
      files = e.target.files;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as any);
    };
    reader.readAsDataURL(files[0]);
  };

  const getCropData = () => {
    if (cropperRef.current?.cropper) {
      const canvas = cropperRef.current.cropper.getCroppedCanvas();
      const width = canvas.width;
      const height = canvas.height;

      // 새 캔버스 생성
      const circleCanvas = document.createElement('canvas');
      circleCanvas.width = width;
      circleCanvas.height = height;
      const ctx = circleCanvas.getContext('2d');

      if (!ctx) return;

      // 원형 경로 생성
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2, 0, 2 * Math.PI, false);
      ctx.closePath();
      ctx.clip();

      // 원형 크롭 이미지 그리기
      ctx.drawImage(canvas, 0, 0, width, height);

      // Blob으로 변환하고 File 객체 생성
      circleCanvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().getTime();
          const randomNumber = Math.random().toString().slice(2, 8);
          const fileName = `${userInfo?.useremail}-${timestamp}-${randomNumber}.png`;
          const croppedFile = new File([blob], `${fileName}.png`, {
            type: 'image/png',
          });
          setCropData(croppedFile);
        }
      }, 'image/png');
    }
  };

  const submitNewThumbnail = async () => {
    if (!cropData) return alert('이미지가 없습니다.');

    const thumbnailformData = new FormData();
    thumbnailformData.append('file', cropData);

    const res = await USER.updateThumbnail(thumbnailformData);
    if (res) {
      onClose();
      // window.location.reload();
    }
    setImage(defaultSrc);
    setCropData(null);
  };

  useEffect(() => {
    if (!cropData) return;

    submitNewThumbnail();
  }, [cropData]);

  // useEffect(() => {
  //   setImage(userInfo?.thumbnail || defaultSrc);
  // }, [userInfo]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="이모지 선택"
      className="createEmojiModal"
      overlayClassName="createEmojiOverlay"
    >
      <div className="FLEX-horizC w-full space-y-5">
        <section key="image-section" className="FLEX-verB w-full">
          <div className="w-1/2 space-y-5">
            <header className="FLEX-verC">
              <input type="file" onChange={onChange} />
            </header>
            <Cropper
              style={{ height: 400, width: '100%' }}
              ref={cropperRef}
              aspectRatio={1}
              preview=".img-preview"
              src={image}
              viewMode={2}
              // zoomTo={0.5}
              minCropBoxHeight={10}
              minCropBoxWidth={10}
              background={false}
              responsive={true}
              autoCropArea={1}
              checkOrientation={false}
              guides={true}
            />
          </div>
          <div className="FLEX-horizC w-1/2">
            <h1>Preview</h1>
            <div className="img-preview w-60 h-60 overflow-hidden border rounded-full" />
          </div>
        </section>
        <button className="BTN hover:bg-custom-main rounded" onClick={getCropData}>
          프로필 수정하기
        </button>
        {/* <div className="box" style={{ width: '50%', float: 'right', height: '300px' }}>
          <h1>
            <span>Crop</span>
            <button style={{ float: 'right' }} onClick={getCropData}>
              Crop Image
            </button>
          </h1>
          <img className="w-1/2" src={cropData} alt="cropped" />
        </div> */}
        <br style={{ clear: 'both' }} />
      </div>
    </Modal>
  );
}
