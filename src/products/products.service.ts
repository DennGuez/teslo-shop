import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { validate as isUUID } from 'uuid'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { PaginationDto } from './../common/dtos/pagination.dto'
import { Product, ProductImage } from './entities'

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService')

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly ProductImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource

  ){}

  async create(createProductDto: CreateProductDto) {
    try {

      const { images = [], ...productDetails } = createProductDto

      /* Creamos la instancia del producto */
      const product  = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.ProductImageRepository.create({ url: image }))
      })
      /* Guardamos producto contra la DB */
      await this.productRepository.save(product)
      // return product
      /* Las imagenes con nos llegan en array y no objectos */
      return { ...product, images: images}

    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll( paginationDto: PaginationDto ) {
    // como son opcionales, les ponemos un valor por defecto
    const { limit = 10, offset = 0 } = paginationDto
    const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations:{
          images: true
        }
    })
    // return products.map( product => ({
    //   ...product,
    //   images: product.images.map(img => img.url)
    // }))
    return products.map( ({images, ...rest}) => ({
      ...rest,
      images: images.map(img => img.url)
    }))
  }

  async findOne(term: string) {
    // const product = await this.productRepository.findOneBy({ term })

    let product: Product

    // if ( isUUID(term) ) {
    //   product = await this.productRepository.findOneBy({id: term})
    // } else {
    //   product = await this.productRepository.findOneBy({slug: term})
    // }

    /* Con QueryBuilder */
     if ( isUUID(term) ) {
      product = await this.productRepository.findOneBy({id: term})
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod')
      // select * from Products where slug='XX' or title="XXXX"
      product = await queryBuilder
      .where('UPPER(title) = :title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLocaleLowerCase()
      })
      .leftJoinAndSelect('prod.images', 'prodImages')
      .getOne()
    }

    if( !product ) 
      throw new NotFoundException(`Product with ${ term } not found`)
    return product
  }

  /* Esta funcion es un intermedio para regresar el objecto como queremos */
  /* Sustituimos esta funcion por la findOne() en el controler */
  async findOnePlain( term: string ) {
    const { images = [], ...rest } = await this.findOne( term )
    return {
      ...rest,
      images: images.map( image => image.url )
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const { images, ...toUpdate } = updateProductDto

    const product = await this.productRepository.preload({
      // id: id,
      id,
      ...toUpdate
    })

    if ( !product ) throw new NotFoundException(`Product with id: ${ id } not found`)

    /* Si tenemos un producto evaluamos si viene con imagenes */
    /* Create QueryRunner */
    const queryRunner = this.dataSource.createQueryRunner()
    /* Conectamos a la DB */
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {

      /* Si vienen las imagenes las eliminamos */
      if ( images ) {
        await queryRunner.manager.delete( ProductImage, { product: { id } } )
        product.images = images.map( 
          image => this.ProductImageRepository.create({ url: image }))
      }

      await queryRunner.manager.save( product )
      // return this.productRepository.save( product)
      // await this.productRepository.save(product)

      /* Aplicamos los cambios */
      await queryRunner.commitTransaction()
      /* Deshabilitamos el QueryRunner */
      await queryRunner.release()

      /* Con este return NO nos devuelve las imagenes */
      // return product
      /* Con este return SI nos devuelve las imagenes */
      return this.findOnePlain( id )
    } catch (error) {

      await queryRunner.rollbackTransaction()
      await queryRunner.release()

      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id)
    await this.productRepository.remove(product)
  }

  private handleDBExceptions( error: any ) {
    if ( error.code === '23505')
    throw new BadRequestException(error.detail)

    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs')
  }

  async deleteAllProducts() {
    const query = this.ProductImageRepository.createQueryBuilder('product')
    /* Eliminamos todos los productos */
    try {
      return await query
        .delete()
        .where({})
        .execute()
    } catch ( error ) {
      this.handleDBExceptions(error)
    }
  }
}
