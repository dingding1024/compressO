import { UseDisclosureProps, useDisclosure } from '@heroui/react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { snapshot, useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Icon from '@/components/Icon'
import Tooltip from '@/components/Tooltip'
import { deleteFile } from '@/tauri/commands/fs'
import AlertDialog, { AlertDialogButton } from '@/ui/Dialogs/AlertDialog'
import { appProxy } from '../-state'

function CompressionActions() {
  const { t } = useTranslation()
  const {
    state: { media, isProcessCompleted, isLoadingMediaFiles, isSaving },
    resetProxy,
  } = useSnapshot(appProxy)

  const alertDisclosure = useDisclosure()

  const handleDiscard = async ({
    closeModal,
  }: {
    closeModal: UseDisclosureProps['onClose']
  }) => {
    try {
      const deletePromises = media
        .flatMap((media) => [
          media.compressedFile?.pathRaw
            ? deleteFile(media.compressedFile.pathRaw)
            : null,
          media.type === 'video' && media.thumbnailPathRaw
            ? deleteFile(media.thumbnailPathRaw)
            : null,
        ])
        .filter(Boolean)

      await Promise.allSettled(deletePromises)
      closeModal?.()
      resetProxy()
    } catch {}
  }

  const handleCancelCompression = () => {
    const appSnapshot = snapshot(appProxy)
    if (appSnapshot.state.isProcessCompleted && !appSnapshot.state.isSaved) {
      alertDisclosure.onOpen()
    } else {
      resetProxy()
    }
  }

  const handleReconfigure = () => {
    appProxy.timeTravel('beforeCompressionStarted')
  }

  return media.length && !isLoadingMediaFiles ? (
    <>
      <div className="w-fit flex justify-center items-center z-[10]">
        {isProcessCompleted ? (
          <Tooltip content={t("actions.reconfigure")} aria-label={t("actions.reconfigure")}>
            <Button
              size="sm"
              onPress={handleReconfigure}
              variant="light"
              radius="full"
              className="gap-1"
              isDisabled={isSaving}
              isIconOnly
            >
              <Icon name="redo" size={22} />{' '}
            </Button>
          </Tooltip>
        ) : null}
        <Tooltip content={t("actions.exit")} aria-label={t("actions.exit")}>
          <Button
            size="sm"
            onPress={handleCancelCompression}
            variant={'light'}
            radius="full"
            className="gap-1"
            isDisabled={isSaving}
            isIconOnly
          >
            <Icon name="cross" size={22} />
          </Button>
        </Tooltip>
      </div>
      <AlertDialog
        title={t('actions.discardTitle')}
        disclosure={alertDisclosure}
        description={t('actions.discardDesc', { count: media.length })}
        renderFooter={({ closeModal }) => (
          <>
            <AlertDialogButton onPress={closeModal}>{t('actions.goBack')}</AlertDialogButton>
            <AlertDialogButton
              color="danger"
              onPress={() => handleDiscard({ closeModal })}
            >
              {t('actions.yes')}
            </AlertDialogButton>
          </>
        )}
      />
    </>
  ) : null
}

export default memo(CompressionActions)
