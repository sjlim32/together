import React, { useState, useEffect, useCallback, createRef, ChangeEvent, DragEvent } from 'react';
import Modal from 'react-modal';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

import sendToast from '@hooks/useToast';
import * as USER from '@services/userAPI';
import * as CALENDAR from '@services/calendarAPI';
import { Image, UserInfo } from '@type/index';
import { useCalendarListStore, useUserInfoStore } from '@store/index';

const defaultSrc =
  'https://raw.githubusercontent.com/roadmanfong/react-cropper/master/example/img/child.jpg';

interface UpdateThumbnailProps {
  userInfo: UserInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateThumbnail({ userInfo, isOpen, onClose }: UpdateThumbnailProps) {
  const { setUserInfo } = useUserInfoStore();
  const [image, setImage] = useState<Image>(defaultSrc);
  const [cropData, setCropData] = useState<File | null>(null);
  const cropperRef = createRef<ReactCropperElement>();

  const onChange = (e: ChangeEvent<HTMLInputElement> | DragEvent<HTMLElement>) => {
    e.preventDefault();
    let files;
    if ('dataTransfer' in e) {
      files = e.dataTransfer.files;
    } else {
      files = e.target.files;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    if (files) reader.readAsDataURL(files[0]);
  };

  const getCropData = () => {
    if (cropperRef.current?.cropper) {
      const canvas = cropperRef.current.cropper.getCroppedCanvas();

      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `${userInfo?.useremail}.png`;
          const croppedFile = new File([blob], fileName, {
            type: 'image/png',
          });
          setCropData(croppedFile);

          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              setUserInfo({
                nickname: userInfo?.nickname || 'user',
                useremail: userInfo?.useremail || 'email',
                birthDay: userInfo?.birthDay || null,
                phone: userInfo?.phone || null,
                thumbnail: reader.result as string,
              });
            }
          };
          reader.readAsDataURL(blob);
        }
      }, 'image/png');
    }
  };

  const submitNewThumbnail = useCallback(async () => {
    if (!cropData) return sendToast('default', '이미지가 없습니다.');

    const thumbnailformData = new FormData();
    thumbnailformData.append('file', cropData);

    const res = await USER.updateThumbnail(thumbnailformData);
    if (res) {
      useCalendarListStore.getState().setIsLoaded(true);
      await CALENDAR.getMyAllCalendar();
      onClose();
    }
    setImage(defaultSrc);
    setCropData(null);
  }, [cropData]);

  useEffect(() => {
    if (!cropData) return;

    submitNewThumbnail();
  }, [cropData]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="프로필 변경"
      className="thumbnailModal"
      overlayClassName="thumbnailOverlay"
    >
      <button
        onClick={onClose}
        className="absolute top-0 right-2 text-3xl text-black hover:text-gray-600"
        aria-label="Close"
      >
        &times;
      </button>
      <div className="FLEX-horizC w-full h-full">
        <section key="image-section" className="FLEX-verB w-full">
          <div className="w-1/2 space-y-5">
            <header className="FLEX-verC">
              <label
                htmlFor="image_input"
                className="my-2 py-2 px-3 mr-2 cursor-pointer border rounded"
              >
                사진 선택
              </label>
              <input
                id="image_input"
                type="file"
                accept="image/*"
                multiple
                onChange={onChange}
                className="sr-only"
              />
            </header>
            <Cropper
              style={{ height: 400, width: '100%' }}
              className="cropper-circle"
              ref={cropperRef}
              aspectRatio={1}
              preview=".img-preview"
              src={image}
              viewMode={2}
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
        <button className="BTN mt-20 hover:bg-custom-light rounded text-2xl" onClick={getCropData}>
          프로필 수정하기
        </button>
        <br style={{ clear: 'both' }} />
      </div>
    </Modal>
  );
}
