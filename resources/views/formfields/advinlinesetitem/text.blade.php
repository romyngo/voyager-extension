<input type="text"
       class="form-control"
       id="{{$row_field}}_{{$key_field}}_{{$row_id?? '%id%'}}"
       data-field-type="{{$field->type}}"
       name="{{$row_field}}_{{$key_field}}_{{$row_id?? '%id%'}}"
       value="{{ $source? (isset($source[$key_field])? $source[$key_field] : '' ): '' }}"
       @include('voyager-extension::formfields.advinlinesetitem.attr')>
