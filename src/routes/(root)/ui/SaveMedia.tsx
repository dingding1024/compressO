import { open, save } from '@tauri-apps/plugin-dialog'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { snapshot, useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Icon from '@/components/Icon'
import { toast } from '@/components/Toast'
import Tooltip from '@/components/Tooltip'
import {
  copyFileToClipboard,
  moveFile,
  showItemInFileManager,
} from '@/tauri/commands/fs'
import { appProxy } from '../-state'

function SaveMedia() {
  const { t } = useTranslation()
  const {
    state: { media, isSaving, isSaved, isCompressing },
  } = useSnapshot(appProxy)
  const mediaFile = media.length === 1 ? media[0] : null

  const handleCompressedMediaSave = useCallback(async () => {
    if (appProxy.state.media.length) {
      const { media } = appProxy.state
      const isBatch = media.length > 1
      const mediaFile = media.length > 0 ? media[0] : null
      const { compressedFile, fileName } = mediaFile ?? {}

      try {
        let pathToSave: string | string[] | null = null

        if (isBatch) {
          const selectedDirectory = await open({
            directory: true,
            title: t('save.title'),
          })
          if (selectedDirectory) {
            pathToSave = selectedDirectory as string
          }
        } else {
          pathToSave = await save({
            title: t('save.titleSingle'),
            defaultPath: `compressO-${compressedFile?.fileNameToDisplay ?? fileName ?? ''}`,
          })
        }

        if (pathToSave) {
          appProxy.state.isSaving = true
          appProxy.state.isSaved = false
          appProxy.state.savedPath = pathToSave

          if (isBatch) {
            const directory = pathToSave as string

            for (let i = 0; i < media.length; i++) {
              const mediaFile = media[i]
              if (mediaFile.compressedFile?.pathRaw) {
                appProxy.state.media[i].compressedFile = {
                  ...(snapshot(appProxy).state.media[i].compressedFile ?? {}),
                  isSaving: true,
                  isSaved: false,
                }

                const destinationPath = `${directory}/compressO-${mediaFile?.compressedFile?.fileNameToDisplay || mediaFile?.fileName}`

                await moveFile(
                  mediaFile.compressedFile.pathRaw,
                  destinationPath,
                )
                appProxy.state.media[i].compressedFile = {
                  ...(snapshot(appProxy).state.media[i].compressedFile ?? {}),
                  savedPath: destinationPath,
                  isSaving: false,
                  isSaved: true,
                }
              }
            }
            appProxy.state.isSaved = true
          } else {
            appProxy.state.media[0].compressedFile = {
              ...(snapshot(appProxy).state.media[0].compressedFile ?? {}),
              isSaving: true,
              isSaved: false,
            }
            await moveFile(
              compressedFile?.pathRaw as string,
              pathToSave as string,
            )
            appProxy.state.media[0].compressedFile = {
              ...(snapshot(appProxy).state.media[0].compressedFile ?? {}),
              savedPath: pathToSave as string,
              isSaving: false,
              isSaved: true,
            }
            appProxy.state.isSaved = true
          }
        }
      } catch (_) {
        toast.error(t('save.couldNotSave'))
        for (let i = 0; i < media.length; i++) {
          appProxy.state.media[i].compressedFile = {
            ...(snapshot(appProxy).state.media[i].compressedFile ?? {}),
            isSaving: false,
            isSaved: false,
          }
        }
      }
      appProxy.state.isSaving = false
    }
  }, [])

  const openInFileManager = async () => {
    const { media } = appProxy.state
    const mediaFile = media.length > 0 ? media[0] : null
    const { compressedFile } = mediaFile ?? {}

    const savedPath = appProxy.state.savedPath ?? compressedFile?.savedPath
    if (!savedPath) return
    try {
      await showItemInFileManager(savedPath)
    } catch {}
  }

  const copyToClipboard = async () => {
    const { media } = appProxy.state
    const mediaFile = media.length > 0 ? media[0] : null
    const { compressedFile } = mediaFile ?? {}

    const savedPath =
      appProxy.state.savedPath ??
      compressedFile?.savedPath ??
      compressedFile?.pathRaw
    if (!savedPath) return

    try {
      await copyFileToClipboard(savedPath)
      toast.success(t('save.copiedToClipboard'))
    } catch {}
  }

  return (
    <div className="flex items-center">
      <Button
        className="flex justify-center items-center"
        color="success"
        onPress={handleCompressedMediaSave}
        isLoading={isSaving}
        isDisabled={isSaving || isSaved}
        fullWidth
      >
        {isSaving ? t('save.saving') : isSaved ? t('save.saved') : t('save.saveMedia')}
        {!isSaving ? (
          <Icon
            name={isSaved ? 'tick' : 'download'}
            className="text-green-300"
          />
        ) : null}
      </Button>
      {isSaved ? (
        <>
          <Tooltip
            content={t("save.showInExplorer")}
            aria-label={t("save.showInExplorer")}
          >
            <Button
              isIconOnly
              className="ml-2 text-green-500"
              onPress={openInFileManager}
            >
              <Icon name="fileExplorer" />
            </Button>
          </Tooltip>
        </>
      ) : null}
      {!isCompressing &&
      mediaFile?.isProcessCompleted &&
      mediaFile?.compressedFile?.isSuccessful ? (
        <Tooltip
          content={t("save.copyToClipboard")}
          aria-label={t("save.copyToClipboard")}
        >
          <Button
            isIconOnly
            className="ml-2 text-green-500"
            onPress={copyToClipboard}
          >
            <Icon name="copy" size={28} />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  )
}

export default React.memo(SaveMedia)
