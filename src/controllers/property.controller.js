import { FileUploadService, PropertyService } from '@/services';

export const createProperty = async (req, res) => {
  const { captions, ...rest } = req.body;
  const parsedCaptions = JSON.parse(captions);
  const imgArr = [];

  if (req.files) {
    const fileUploadPromises = req.files.map(async (imgFile, idx) => {
      const imgRes = await FileUploadService.fileUpload(imgFile, 'property');
      imgArr.push({ imgUrl: imgRes.url, caption: parsedCaptions[idx] });
    });

    await Promise.all(fileUploadPromises);
  }

  try {
    const newProperty = await PropertyService.create(rest, imgArr);
    return res.status(201).json({
      message: 'success',
      data: newProperty,
      status: 201,
      success: true,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

export const getProperties = async (req, res) => {
  try {
    const result = await PropertyService.findMany(req.query);
    if (result) {
      return res.status(200).json({
        data: result?.properties,
        status: 200,
        success: true,
        ...result?.pagination,
      });
    }
    return res.status(409).json({
      message: 'Not found',
      data: null,
      status: 409,
      success: true,
    });
  } catch (error) {
    res.status(404).json({ msg: error.message });
  }
};
export const getAllOwnerProperty = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await PropertyService.findManyById(id, req.query);
    if (result) {
      return res.status(200).json({
        message: 'success',
        data: result?.properties,
        status: 200,
        success: true,
        ...result?.pagination,
      });
    }
    return res.status(409).json({
      message: 'Not found',
      data: null,
      status: 409,
      success: true,
    });
  } catch (error) {
    res.status(404).json({ msg: error.message });
  }
};
export const getPropertyById = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await PropertyService.findById(id);
    if (result) {
      return res.status(200).json({
        message: 'success',
        data: result,
        status: 200,
        success: true,
      });
    }
    return res.status(409).json({
      message: 'Not found',
      data: null,
      status: 409,
      success: true,
    });
  } catch (error) {
    res.status(404).json({ msg: error.message });
  }
};
export const getPropertyNameList = async (req, res) => {
  try {
    const propertyNames = await PropertyService.findPropertyNameList(req.query);

    res.status(200).json({
      message: 'success',
      data: propertyNames,
      status: 200,
      success: true,
    });
  } catch (error) {
    console.error('Error in PropertyController.searchProperties:', error);
    res.status(404).json({ msg: error.message });
  }
};
export const updateProperty = async (req, res) => {
  const { propertyImagesUrls, propertyTags, amenities, captions, ...rest } =
    req.body;
  const parsedPropertyTags = JSON.parse(propertyTags);
  let parsedAmenities = [];
  if (amenities) {
    parsedAmenities = JSON.parse(amenities);
  }
  const parsedImageUrls = propertyImagesUrls
    ? JSON.parse(propertyImagesUrls)
    : [];
  const parsedCaptions = JSON.parse(captions);
  const imgArr = [];

  if (req.files) {
    const fileUploadPromises = req.files.map(async (imgFile, idx) => {
      const imgRes = await FileUploadService.fileUpload(imgFile, 'property');
      imgArr.push({ imgUrl: imgRes.url, caption: parsedCaptions[idx] });
    });

    await Promise.all(fileUploadPromises);
  }

  let allImages = [...parsedImageUrls, ...imgArr];
  allImages = allImages.map((ele) => {
    return { caption: ele.caption, imgUrl: ele.imgUrl };
  });

  const reqObj = { ...rest, allImages, parsedPropertyTags, parsedAmenities };

  try {
    const id = req.params.id;
    const result = await PropertyService.update(id, reqObj);
    return res.status(200).json({
      message: 'success',
      data: result,
      status: 200,
      success: true,
    });
  } catch (error) {
    res.status(404).json({ msg: error.message });
  }
};
export const deleteProperty = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await PropertyService.remove(id);

    return res.status(200).json({
      message: 'success',
      data: result,
      status: 200,
      success: true,
    });
  } catch (error) {
    res.status(404).json({ msg: error.message });
  }
};
