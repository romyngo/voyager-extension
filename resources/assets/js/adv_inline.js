$('document').ready(function () {

    const inlineItemsList = $('.adv-inline-set-list')

    // ------------------------------
    // Init Rich Text Box
    // ------------------------------
    $('.inlineSetRichTextBox').each(function(index, elem) {
        addRichTextBox($(elem))
    })

    function addRichTextBox(elRich) {
        const id = elRich.attr('id')
        const min_height = elRich.data('min-height')?? 100

        const additionalConfig = {
            selector: 'textarea.inlineSetRichTextBox[name="' + elRich.attr('name') +'"]',
        }

        tinymce.init(window.voyagerTinyMCE.getConfig(additionalConfig))
        const editor = tinymce.get(id)
        // editor.settings.min_height = min_height
    }

    // ------------------------------
    // Init Ace Code Editor
    // ------------------------------
    $('.inline-code-editor').each(function () {
        let codeEditor = ace.edit(this);
        initCodeEditor(codeEditor, this)
    })

    function initCodeEditor(codeEditor, elEditor) {

        const field = $(elEditor)

        const mode = field.data('mode')?? 'html'
        const theme = field.data('theme')?? 'github'

        const minLines = field.data('minlines')?? 4
        const maxLines = field.data('maxlines')?? 100

        //console.log(field.data('mode'), field.data('theme'))

        ace.config.set('basePath', '/admin/voyager-assets/?path=js/ace/libs')
        codeEditor.session.setMode("ace/mode/" + mode)
        codeEditor.setTheme("ace/theme/" + theme)
        codeEditor.setOption("maxLines", maxLines)
        codeEditor.setOption("minLines", minLines)

        codeEditor.on('change', function(event, el) {
            ace_editor_id = el.container.id
            ace_editor_textarea = document.getElementById($(el.container).data('textarea-id'))
            ace_editor_instance = ace.edit(ace_editor_id)
            ace_editor_textarea.value = ace_editor_instance.getValue()
        });
    }

    // ------------------------------
    // Sorting rows
    // ------------------------------
    const elNavPanels = $('.navbar-top, .float-action-panel' )
    inlineItemsList.each(function(index, elem) {
        Sortable.create( document.getElementById($(elem).attr('id')), {
            animation: 200,
            sort: true,
            scroll: true,
            handle: ".adv-inline-set-handle",
            onSort: function (evt) {
                setInlineIDsItems($(elem))
            },
            onStart: function (evt) {
                elNavPanels.css('pointer-events', 'none')
            },
            onEnd: function (evt) {
                elNavPanels.css('pointer-events', 'auto')
                // Remove and add TinyMCE, otherwise won't work after drag and drop
                const elRichEditors = $(evt.item).find('.inlineSetRichTextBox')
                elRichEditors.each(function(idx, item) {
                    console.log($(item).attr('id'))
                    tinymce.remove("#" + $(item).attr('id'))
                    addRichTextBox($(item))
                })
            },
        })
    })

    // ------------------------------
    // Sorting media
    // ------------------------------
    $('.adv-inline-set-media-list').each(function(index, elem) {
        Sortable.create( document.getElementById($(elem).attr('id')), {
            animation: 200,
            sort: true,
            scroll: true,
            onSort: function (evt) {
                const elList = $(evt.item.closest('.adv-inline-set-media-list'))
                const newOrderList = elList.find('.adv-inline-set-media-item').map(function(){
                    return $(this).data('media-id')
                }).toArray()

                const params = {
                    files_ids_order: newOrderList,
                    _token:   csrf_token
                }

                $.post(vext_routes.ext_media_sort, params, function (response) {
                    if (response && response.data && response.data.status && response.data.status == 200) {
                        toastr.success(response.data.message)
                    } else {
                        toastr.error(vext.trans('bread.error_sorting_media'))
                    }
                })

            }
        })
    })

    // ------------------------------
    // Start Timer to Remove Media Item
    // ------------------------------
    inlineItemsList.on('click', '.adv-inline-set-media-delete', function () {

        const elMedia = $(this).closest('.adv-inline-set-media-item')
        const elRemoveHolder = elMedia.find('.adv-inline-set-media-removing')
        const elRemoveBar = elMedia.find('.removing-bar')

        elRemoveHolder.css('display', 'flex')
        elRemoveBar.css('width', '0%')

        let removeCounter = 0
        const removeTimerTick = parseInt(elMedia.data('remove-delay')) / 100

        const intDeleteMedia = setInterval(function() {

            elMedia.data('remove-counter', removeCounter)
            elRemoveBar.css('width', removeCounter + '%')
            removeCounter++

            if (removeCounter >= 100) {
                clearInterval(intDeleteMedia)
                const params = {
                    media_ids: [elMedia.data('media-id')],
                    _token:   csrf_token
                }
                $.post(vext_routes.ext_media_remove, params, function (response) {
                    if ( response && response.data && response.data.status == 200) {
                        toastr.success(response.data.message)
                    } else {
                        toastr.error(vext.trans('bread.error_removing_media'))
                    }
                })
                elMedia.remove()
            }
        }, removeTimerTick)

        elMedia.data('remove-interval-id', intDeleteMedia)
    })

    // ------------------------------
    // Cancel Remove Media Item
    // ------------------------------
    inlineItemsList.on('click', '.adv-inline-set-media-removing', function () {
        const elMedia = $(this).closest('.adv-inline-set-media-item')
        const elRemoveHolder = elMedia.find('.adv-inline-set-media-removing')

        clearInterval(elMedia.data('remove-interval-id'))
        elRemoveHolder.css('display', 'none')
    })

    function setInlineIDsItems(el) {
        let row_ids = []
        let ids = []
        el.find('.adv-inline-set-item').each(function(idx, item) {
            ids.push($(item).data('id'))
            row_ids.push($(item).data('row-id'))
            //console.log(item)
        })
        el.find('.adv-inline-set-row-ids').val(row_ids)
        el.find('.adv-inline-set-ids').val(ids)
    }

    // ------------------------------
    // Remove Inline Item
    // ------------------------------
    inlineItemsList.on('click', '.adv-inline-set-delete', function () {
        const elItem = $(this).closest('.adv-inline-set-item')
        const elInlineList = $(this).closest('.adv-inline-set-list')
        const elDeletedIds = elInlineList.find('.adv-inline-set-deleted-ids')
        const elDeletedMedia = elInlineList.find('.adv-inline-set-deleted-media')

        // Manage source IDs list which will be deleted after Submit
        if (!elItem.data('new') && !elInlineList.data('local-storage')) {
            addInlineItemInArray(elDeletedIds, elItem.data('id'))
        }

        // Manage Media-Library collections list which will be deleted after Submit
        elItem.find('.media-library').each(function(idx, item) {
            addInlineItemInArray(elDeletedMedia, $(item).attr('name').slice(0, -2))
        })

        elItem.remove()

        setInlineIDsItems(elInlineList)
    })

    function addInlineItemInArray(elInput, addValue) {
        let oldValues = elInput.val().split(',')
        oldValues = oldValues[0] === ''? [] : oldValues
        oldValues.push(addValue)
        elInput.val(oldValues.join(','))
    }

    function getNextInlineID(elInlineList) {
        const elInlineItems = elInlineList.find('.adv-inline-set-item')
        let maxID = 0
        elInlineItems.each(function(idx, item) {
            const index = $(item).data('row-id')
            if (index > maxID ) {
                maxID = index
            }
        })
        return maxID + 1
    }

    // ------------------------------
    // Add new Inline Item to the Inline Items List
    // ------------------------------
    $('.add-inline-set').on('click', function () {
        const elWrapper = $(this).closest('.adv-inline-set-wrapper')
        const elInlineList = elWrapper.find('.adv-inline-set-list')
        const localStorage = elInlineList.data('local-storage')
        const newIndex = getNextInlineID(elInlineList)

        const elNewInlineItem = $($('#template_' + elInlineList.data('field')).prop('content')).find('.adv-inline-set-item').clone()

        elNewInlineItem.removeClass('adv-inline-set-template')
        elNewInlineItem.data('row-id', newIndex)
        elNewInlineItem.find('.adv-inline-set-index').val(localStorage? newIndex : 0)

        const richTextList = []
        const codeList = []

        // Set new FOR, ID and NAME attrs for a new item
        elNewInlineItem.find('.form-group').each(function(idx, item) {
            const elLabel = $(item).find('label')
            const elField = $(item).find('.adv-form-control')
            const fieldType = elField.data('field-type')

            elLabel.each(function(i, field) {
                let label = $(field)
                label.attr('for', label.attr('for').replace('%id%', newIndex))
            })

            elField.each(function(i, field) {

                let elField = $(field)

                elField.attr('id', elField.attr('id').replace('%id%', newIndex))

                if (elField.attr('name')) {
                    elField.attr('name', elField.attr('name').replace('%id%', newIndex))
                }

                if (fieldType === 'code') {
                    if (elField.data('textarea-id')) {
                        elField.data('textarea-id', elField.data('textarea-id').replace('%id%', newIndex) )
                        codeList.push(elField.attr('id'))
                    }
                }

                if (fieldType === 'richtext') {
                    richTextList.push(elField.attr('name'))
                }

            })

        })

        elInlineList.append(elNewInlineItem)

        // Inint new Tiny toggles
        const toggleList = elInlineList.find('.tiny-toggle')
        toggleList.each(function(idx, item) {
            if (!$(item).parent().hasClass('tt')) {
                $(item).tinyToggle()
            }
        })

        // Inint new Tinymce Editors
        richTextList.forEach(element => {
            addRichTextBox($(`[name='${element}']`))
        })

        // Inint new Ace Editors
        codeList.forEach(element => {
            const codeEditor = ace.edit(document.getElementById(element))
            initCodeEditor(codeEditor, document.getElementById(element))
        })

        // Remove ADD button if we have only Single Item
        if(elInlineList.data('many') !== 1) {
            elWrapper.find('.adv-inline-set-actions').remove()
        }

        setInlineIDsItems(elInlineList)
    })


})
